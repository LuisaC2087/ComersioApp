// ============================================================
//  MICROSERVICIO DE PEDIDOS (carrito, compras y facturas)
//
//  Carrito (token de cliente):
//  - GET  /carrito      -> el carrito del usuario
//  - POST /carrito      -> agrega un producto: RESERVA (descuenta) el stock
//  - PUT  /carrito      -> cambia la cantidad; en 0 lo quita y DEVUELVE el stock
//
//  Compras (token de cliente):
//  - POST /pedidos      -> paga (simulado) lo que hay en el carrito y guarda la factura
//  - GET  /pedidos      -> historial de compras del usuario
//  - GET  /pedidos/:id  -> detalle de una compra (la factura)
//
//  Administrador (token con rol "admin"):
//  - GET /admin/pedidos        -> todos los pedidos de la tienda
//  - PUT /admin/pedidos/:id    -> cambia el estado (pagado/enviado/entregado/cancelado)
//
//  RESERVA DE STOCK
//  Al agregar al carrito, las unidades salen del stock (tabla producto_tallas)
//  y quedan apartadas para ese usuario (tabla carrito_items). Si las quita,
//  vuelven al stock. Si el carrito queda RESERVA_MINUTOS sin tocarse, la
//  reserva vence y las unidades vuelven solas al stock (así un carrito
//  abandonado no bloquea la tienda).
//
//  Los microservicios comparten la base de datos: aquí se leen las tablas
//  "productos" y "producto_tallas" para usar siempre los precios y el stock reales.
// ============================================================
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const simularPago = require('./pago-simulado');

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-local';
const IVA = Number(process.env.IVA || 0.12); // 12 %
const RESERVA_MINUTOS = Number(process.env.RESERVA_MINUTOS || 30);

const ESTADOS = ['pagado', 'enviado', 'entregado', 'cancelado'];

const app = express();
app.use(cors());
app.use(express.json());

// Documentación interactiva de la API en /docs
const swaggerUi = require('swagger-ui-express');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(require('./swagger')));

// ---------- Base de datos ----------
async function prepararBaseDeDatos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id              SERIAL PRIMARY KEY,
      usuario_id      INT NOT NULL,
      cliente_nombre  TEXT NOT NULL,
      cliente_email   TEXT NOT NULL,
      subtotal        NUMERIC(10, 2) NOT NULL,
      impuesto        NUMERIC(10, 2) NOT NULL,
      total           NUMERIC(10, 2) NOT NULL,
      metodo_pago     TEXT NOT NULL,
      referencia_pago TEXT NOT NULL,
      estado          TEXT NOT NULL DEFAULT 'pagado',
      fecha           TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'pagado'`);
  await db.query(`
    CREATE TABLE IF NOT EXISTS pedido_items (
      id          SERIAL PRIMARY KEY,
      pedido_id   INT NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
      producto_id INT NOT NULL,
      nombre      TEXT NOT NULL,
      talla       TEXT,
      cantidad    INT NOT NULL,
      precio      NUMERIC(10, 2) NOT NULL
    )
  `);
  // El carrito de cada usuario: lo que tiene reservado (ya descontado del stock)
  await db.query(`
    CREATE TABLE IF NOT EXISTS carrito_items (
      usuario_id  INT NOT NULL,
      producto_id INT NOT NULL,
      talla       TEXT NOT NULL,
      cantidad    INT NOT NULL CHECK (cantidad > 0),
      actualizado TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- para saber cuándo vence la reserva
      PRIMARY KEY (usuario_id, producto_id, talla)
    )
  `);
}

// ---------- Utilidades ----------
function autenticar(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.usuario = jwt.verify(token, JWT_SECRET); // { id, nombre, email, rol }
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });
  }
}

function soloAdmin(req, res, next) {
  autenticar(req, res, () => {
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
    }
    next();
  });
}

const redondear = (n) => Math.round(n * 100) / 100;

// Número de factura legible: 7 -> "FAC-000007"
const numeroFactura = (id) => 'FAC-' + String(id).padStart(6, '0');

// Ejecuta una función dentro de una transacción (todo o nada)
async function enTransaccion(trabajo) {
  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');
    const resultado = await trabajo(cliente);
    await cliente.query('COMMIT');
    return resultado;
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
}

// Error con código HTTP: se lanza dentro de una transacción para cancelarla
// y responder ese código al cliente.
function errorHttp(status, mensaje) {
  const e = new Error(mensaje);
  e.status = status;
  return e;
}

// Explica por qué no se pudo reservar el stock de un producto/talla.
// Usa la misma conexión de la transacción en curso.
async function motivoSinStock(cliente, productoId, talla) {
  const { rows } = await cliente.query(
    `SELECT p.nombre, t.stock
       FROM productos p
       LEFT JOIN producto_tallas t ON t.producto_id = p.id AND t.talla = $2
      WHERE p.id = $1`,
    [productoId, talla]
  );
  if (rows.length === 0) return `El producto ${productoId} ya no existe`;
  if (rows[0].stock === null) return `"${rows[0].nombre}" no tiene la talla ${talla}`;
  return `Solo quedan ${rows[0].stock} unidades de "${rows[0].nombre}" en talla ${talla}`;
}

// ---------- Reserva de stock ----------
// Mueve "cantidad" unidades entre el stock y el carrito:
//   cantidad > 0  -> sale del stock (solo si alcanza)
//   cantidad < 0  -> vuelve al stock
async function moverStock(cliente, productoId, talla, cantidad) {
  if (cantidad > 0) {
    const r = await cliente.query(
      `UPDATE producto_tallas SET stock = stock - $1
        WHERE producto_id = $2 AND talla = $3 AND stock >= $1`,
      [cantidad, productoId, talla]
    );
    if (r.rowCount === 0) throw errorHttp(409, await motivoSinStock(cliente, productoId, talla));
  } else if (cantidad < 0) {
    await cliente.query(
      `UPDATE producto_tallas SET stock = stock + $1 WHERE producto_id = $2 AND talla = $3`,
      [-cantidad, productoId, talla]
    );
  }
}

// Devuelve al stock lo que está en carritos que nadie toca hace RESERVA_MINUTOS
// minutos, y borra esos carritos. Se ejecuta cada minuto y antes de leer un carrito.
async function liberarReservasVencidas() {
  await db.query(
    `WITH vencidos AS (
       DELETE FROM carrito_items
        WHERE actualizado < NOW() - MAKE_INTERVAL(mins => $1)
        RETURNING producto_id, talla, cantidad
     )
     UPDATE producto_tallas t
        SET stock = t.stock + v.total
       FROM (SELECT producto_id, talla, SUM(cantidad) AS total
               FROM vencidos GROUP BY producto_id, talla) v
      WHERE t.producto_id = v.producto_id AND t.talla = v.talla`,
    [RESERVA_MINUTOS]
  );
}

// El carrito del usuario, con nombre, precio e imagen actuales del producto
async function obtenerCarrito(usuarioId) {
  await liberarReservasVencidas();
  const { rows } = await db.query(
    `SELECT c.producto_id, c.talla, c.cantidad, c.actualizado, p.nombre, p.precio, p.imagen
       FROM carrito_items c
       JOIN productos p ON p.id = c.producto_id
      WHERE c.usuario_id = $1
      ORDER BY p.nombre, c.talla`,
    [usuarioId]
  );
  const ultimoCambio = rows.reduce((max, i) => (i.actualizado > max ? i.actualizado : max), new Date(0));
  return {
    items: rows.map(({ actualizado, ...item }) => item),
    minutosReserva: RESERVA_MINUTOS,
    // Hora en que vence la reserva (null si el carrito está vacío)
    venceEn: rows.length ? new Date(ultimoCambio.getTime() + RESERVA_MINUTOS * 60000) : null,
  };
}

// Cualquier cambio en el carrito renueva el plazo de toda la reserva
const renovarReserva = (cliente, usuarioId) =>
  cliente.query('UPDATE carrito_items SET actualizado = NOW() WHERE usuario_id = $1', [usuarioId]);

async function obtenerPedido(id, usuarioId) {
  const pedido = await db.query('SELECT * FROM pedidos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  if (pedido.rows.length === 0) return null;

  const items = await db.query('SELECT * FROM pedido_items WHERE pedido_id = $1 ORDER BY id', [id]);
  return { ...pedido.rows[0], numero_factura: numeroFactura(id), items: items.rows };
}

// ---------- Rutas del carrito ----------
app.get('/', (req, res) => {
  res.json({ servicio: 'pedidos', estado: 'ok' });
});

app.get('/carrito', autenticar, async (req, res) => {
  res.json(await obtenerCarrito(req.usuario.id));
});

// Agregar al carrito: suma "cantidad" a lo que ya tenía y la descuenta del stock
app.post('/carrito', autenticar, async (req, res) => {
  const { productoId, talla } = req.body;
  const cantidad = Number(req.body.cantidad);
  if (!productoId || !talla) return res.status(400).json({ error: 'Falta el producto o la talla' });
  if (!Number.isInteger(cantidad) || cantidad < 1) return res.status(400).json({ error: 'Cantidad inválida' });

  await enTransaccion(async (cliente) => {
    await moverStock(cliente, productoId, talla, cantidad);
    await cliente.query(
      `INSERT INTO carrito_items (usuario_id, producto_id, talla, cantidad) VALUES ($1, $2, $3, $4)
       ON CONFLICT (usuario_id, producto_id, talla)
       DO UPDATE SET cantidad = carrito_items.cantidad + EXCLUDED.cantidad`,
      [req.usuario.id, productoId, talla, cantidad]
    );
    await renovarReserva(cliente, req.usuario.id);
  });
  res.status(201).json(await obtenerCarrito(req.usuario.id));
});

// Cambiar la cantidad de un producto del carrito (0 = quitarlo).
// Solo se mueve la DIFERENCIA: de 3 a 5 reserva 2 más; de 3 a 1 devuelve 2.
app.put('/carrito', autenticar, async (req, res) => {
  const { productoId, talla } = req.body;
  const nueva = Number(req.body.cantidad);
  if (!productoId || !talla) return res.status(400).json({ error: 'Falta el producto o la talla' });
  if (!Number.isInteger(nueva) || nueva < 0) return res.status(400).json({ error: 'Cantidad inválida' });

  await enTransaccion(async (cliente) => {
    const actual = await cliente.query(
      `SELECT cantidad FROM carrito_items WHERE usuario_id = $1 AND producto_id = $2 AND talla = $3 FOR UPDATE`,
      [req.usuario.id, productoId, talla]
    );
    if (actual.rows.length === 0) throw errorHttp(404, 'Ese producto ya no está en tu carrito');

    await moverStock(cliente, productoId, talla, nueva - actual.rows[0].cantidad);

    if (nueva === 0) {
      await cliente.query(
        'DELETE FROM carrito_items WHERE usuario_id = $1 AND producto_id = $2 AND talla = $3',
        [req.usuario.id, productoId, talla]
      );
    } else {
      await cliente.query(
        'UPDATE carrito_items SET cantidad = $4 WHERE usuario_id = $1 AND producto_id = $2 AND talla = $3',
        [req.usuario.id, productoId, talla, nueva]
      );
    }
    await renovarReserva(cliente, req.usuario.id);
  });
  res.json(await obtenerCarrito(req.usuario.id));
});

// ---------- Rutas de compras ----------
// Paga lo que el usuario tiene en su carrito. El stock YA está descontado
// (se reservó al agregar), así que aquí solo se cobra y se guarda la factura.
app.post('/pedidos', autenticar, async (req, res) => {
  await liberarReservasVencidas();

  const pedidoId = await enTransaccion(async (cliente) => {
    // 1) Leemos el carrito con los precios REALES de la tabla productos
    const { rows: items } = await cliente.query(
      `SELECT c.producto_id, c.talla, c.cantidad, p.nombre, p.precio
         FROM carrito_items c
         JOIN productos p ON p.id = c.producto_id
        WHERE c.usuario_id = $1
        FOR UPDATE OF c`,
      [req.usuario.id]
    );
    if (items.length === 0) {
      throw errorHttp(400, 'Tu carrito está vacío (o la reserva venció). Vuelve a agregar los productos.');
    }

    // 2) Totales
    const subtotal = redondear(items.reduce((suma, i) => suma + i.precio * i.cantidad, 0));
    const impuesto = redondear(subtotal * IVA);
    const total = redondear(subtotal + impuesto);

    // 3) Pago simulado. Si se rechaza, el carrito queda igual (sigue reservado)
    const pago = simularPago(req.body.pago);
    if (!pago.aprobado) throw errorHttp(402, pago.mensaje);

    // 4) Guardamos el pedido, sus productos y vaciamos el carrito
    const { rows } = await cliente.query(
      `INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, subtotal, impuesto, total, metodo_pago, referencia_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.usuario.id, req.usuario.nombre, req.usuario.email, subtotal, impuesto, total, pago.metodo, pago.referencia]
    );
    const id = rows[0].id;

    for (const i of items) {
      await cliente.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, talla, cantidad, precio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, i.producto_id, i.nombre, i.talla, i.cantidad, i.precio]
      );
    }
    await cliente.query('DELETE FROM carrito_items WHERE usuario_id = $1', [req.usuario.id]);
    return id;
  });

  res.status(201).json(await obtenerPedido(pedidoId, req.usuario.id));
});

app.get('/pedidos', autenticar, async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.*,
            (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id)::int AS articulos
       FROM pedidos p
      WHERE p.usuario_id = $1
      ORDER BY p.fecha DESC`,
    [req.usuario.id]
  );
  res.json(rows.map((p) => ({ ...p, numero_factura: numeroFactura(p.id) })));
});

app.get('/pedidos/:id', autenticar, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  const pedido = await obtenerPedido(id, req.usuario.id);
  if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json(pedido);
});

// ---------- Rutas de administrador ----------
app.get('/admin/pedidos', soloAdmin, async (req, res) => {
  const { rows } = await db.query(
    `SELECT p.*,
            (SELECT COALESCE(SUM(cantidad), 0) FROM pedido_items WHERE pedido_id = p.id)::int AS articulos
       FROM pedidos p
      ORDER BY p.fecha DESC`
  );
  res.json(rows.map((p) => ({ ...p, numero_factura: numeroFactura(p.id) })));
});

app.put('/admin/pedidos/:id', soloAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { estado } = req.body;
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });
  if (!ESTADOS.includes(estado)) {
    return res.status(400).json({ error: `El estado debe ser uno de: ${ESTADOS.join(', ')}` });
  }

  const { rows } = await db.query('UPDATE pedidos SET estado = $1 WHERE id = $2 RETURNING *', [estado, id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.json({ ...rows[0], numero_factura: numeroFactura(id) });
});

// Errores: los creados con errorHttp responden su código; el resto, 500
app.use((err, req, res, next) => {
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------- Arranque ----------
prepararBaseDeDatos()
  .then(() => {
    app.listen(PORT, () => console.log(`Servicio de pedidos en puerto ${PORT}`));
    // Cada minuto devolvemos al stock las reservas vencidas
    setInterval(() => liberarReservasVencidas().catch((e) => console.error('Reservas:', e.message)), 60000);
  })
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });

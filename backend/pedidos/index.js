// ============================================================
//  MICROSERVICIO DE PEDIDOS
//
//  Cliente (token):
//  - POST /pedidos      -> descuenta stock, paga (simulado) y guarda la factura
//  - GET  /pedidos      -> historial de compras del usuario
//  - GET  /pedidos/:id  -> detalle de una compra (la factura)
//
//  Administrador (token con rol "admin"):
//  - GET /admin/pedidos        -> todos los pedidos de la tienda
//  - PUT /admin/pedidos/:id    -> cambia el estado (pagado/enviado/entregado/cancelado)
//
//  Los microservicios comparten la base de datos, así que la compra se hace
//  en UNA transacción: descontar stock + guardar pedido, o nada de los dos.
//  El precio se lee de la tabla "productos" ahí mismo, para que nadie pueda
//  inventar precios desde el celular.
// ============================================================
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const simularPago = require('./pago-simulado');

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-local';
const IVA = Number(process.env.IVA || 0.12); // 12 %

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

async function obtenerPedido(id, usuarioId) {
  const pedido = await db.query('SELECT * FROM pedidos WHERE id = $1 AND usuario_id = $2', [id, usuarioId]);
  if (pedido.rows.length === 0) return null;

  const items = await db.query('SELECT * FROM pedido_items WHERE pedido_id = $1 ORDER BY id', [id]);
  return { ...pedido.rows[0], numero_factura: numeroFactura(id), items: items.rows };
}

// ---------- Rutas del cliente ----------
app.get('/', (req, res) => {
  res.json({ servicio: 'pedidos', estado: 'ok' });
});

app.post('/pedidos', autenticar, async (req, res) => {
  const { items, pago } = req.body; // items: [{ productoId, talla, cantidad }]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }
  for (const item of items) {
    if (!Number.isInteger(Number(item.cantidad)) || Number(item.cantidad) < 1) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }
  }

  // Toda la compra ocurre en una transacción: o se guarda todo, o nada
  const cliente = await db.connect();
  try {
    await cliente.query('BEGIN');

    // 1) Descontamos el stock de cada producto. El UPDATE solo funciona si
    //    hay stock suficiente; de paso nos devuelve el nombre y el PRECIO REAL.
    const detalle = [];
    for (const item of items) {
      const cantidad = Number(item.cantidad);
      const r = await cliente.query(
        `UPDATE productos SET stock = stock - $1
          WHERE id = $2 AND stock >= $1
          RETURNING nombre, precio`,
        [cantidad, item.productoId]
      );
      if (r.rows.length === 0) {
        await cliente.query('ROLLBACK');
        const p = await db.query('SELECT nombre, stock FROM productos WHERE id = $1', [item.productoId]);
        const mensaje = p.rows.length === 0
          ? `El producto ${item.productoId} ya no existe`
          : `Solo quedan ${p.rows[0].stock} unidades de "${p.rows[0].nombre}"`;
        return res.status(409).json({ error: mensaje });
      }
      detalle.push({
        productoId: item.productoId,
        nombre: r.rows[0].nombre,
        talla: item.talla || null,
        cantidad,
        precio: r.rows[0].precio,
      });
    }

    // 2) Calculamos los totales con los precios de la base de datos
    const subtotal = redondear(detalle.reduce((suma, d) => suma + d.precio * d.cantidad, 0));
    const impuesto = redondear(subtotal * IVA);
    const total = redondear(subtotal + impuesto);

    // 3) Simulamos el pago. Si se rechaza, el ROLLBACK devuelve el stock.
    const pagoResultado = simularPago(pago);
    if (!pagoResultado.aprobado) {
      await cliente.query('ROLLBACK');
      return res.status(402).json({ error: pagoResultado.mensaje });
    }

    // 4) Guardamos el pedido y sus productos
    const { rows } = await cliente.query(
      `INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, subtotal, impuesto, total, metodo_pago, referencia_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.usuario.id, req.usuario.nombre, req.usuario.email, subtotal, impuesto, total, pagoResultado.metodo, pagoResultado.referencia]
    );
    const pedidoId = rows[0].id;

    for (const d of detalle) {
      await cliente.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, talla, cantidad, precio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pedidoId, d.productoId, d.nombre, d.talla, d.cantidad, d.precio]
      );
    }
    await cliente.query('COMMIT');

    res.status(201).json(await obtenerPedido(pedidoId, req.usuario.id));
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }
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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------- Arranque ----------
prepararBaseDeDatos()
  .then(() => app.listen(PORT, () => console.log(`Servicio de pedidos en puerto ${PORT}`)))
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });

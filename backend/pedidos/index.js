// ============================================================
//  MICROSERVICIO DE PEDIDOS
//  - POST /pedidos      -> paga (simulado) y guarda la compra/factura
//  - GET  /pedidos      -> historial de compras del usuario
//  - GET  /pedidos/:id  -> detalle de una compra (la factura)
//
//  Todas las rutas requieren el token que entrega el servicio de usuarios.
//  Para conocer los precios reales, este servicio CONSULTA al servicio
//  de productos (así el cliente no puede inventar precios).
// ============================================================
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const simularPago = require('./pago-simulado');

const PORT = process.env.PORT || 3003;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-local';
const PRODUCTOS_URL = process.env.PRODUCTOS_URL || 'http://localhost:3002';
const IVA = Number(process.env.IVA || 0.12); // 12 %

const app = express();
app.use(cors());
app.use(express.json());

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
      fecha           TIMESTAMPTZ DEFAULT NOW()
    )
  `);
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
    req.usuario = jwt.verify(token, JWT_SECRET); // { id, nombre, email }
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });
  }
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

// ---------- Rutas ----------
app.get('/', (req, res) => {
  res.json({ servicio: 'pedidos', estado: 'ok' });
});

app.post('/pedidos', autenticar, async (req, res) => {
  const { items, pago } = req.body; // items: [{ productoId, talla, cantidad }]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'El carrito está vacío' });
  }

  // 1) Pedimos el precio real de cada producto al microservicio de productos
  const detalle = [];
  for (const item of items) {
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      return res.status(400).json({ error: 'Cantidad inválida' });
    }
    const resp = await fetch(`${PRODUCTOS_URL}/productos/${item.productoId}`);
    if (!resp.ok) {
      return res.status(400).json({ error: `El producto ${item.productoId} no existe` });
    }
    const producto = await resp.json();
    detalle.push({
      productoId: producto.id,
      nombre: producto.nombre,
      talla: item.talla || null,
      cantidad,
      precio: producto.precio,
    });
  }

  // 2) Calculamos los totales
  const subtotal = redondear(detalle.reduce((suma, d) => suma + d.precio * d.cantidad, 0));
  const impuesto = redondear(subtotal * IVA);
  const total = redondear(subtotal + impuesto);

  // 3) Simulamos el pago
  const pagoResultado = simularPago(pago);
  if (!pagoResultado.aprobado) {
    return res.status(402).json({ error: pagoResultado.mensaje });
  }

  // 4) Guardamos pedido + productos en una transacción (o se guarda todo o nada)
  const cliente = await db.connect();
  let pedidoId;
  try {
    await cliente.query('BEGIN');
    const { rows } = await cliente.query(
      `INSERT INTO pedidos (usuario_id, cliente_nombre, cliente_email, subtotal, impuesto, total, metodo_pago, referencia_pago)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.usuario.id, req.usuario.nombre, req.usuario.email, subtotal, impuesto, total, pagoResultado.metodo, pagoResultado.referencia]
    );
    pedidoId = rows[0].id;

    for (const d of detalle) {
      await cliente.query(
        `INSERT INTO pedido_items (pedido_id, producto_id, nombre, talla, cantidad, precio)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [pedidoId, d.productoId, d.nombre, d.talla, d.cantidad, d.precio]
      );
    }
    await cliente.query('COMMIT');
  } catch (err) {
    await cliente.query('ROLLBACK');
    throw err;
  } finally {
    cliente.release();
  }

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

// ============================================================
//  MICROSERVICIO DE PRODUCTOS
//  - GET /productos               -> lista todo el catálogo
//  - GET /productos?categoria=X   -> filtra por categoría
//  - GET /productos/:id           -> un producto
//  - GET /categorias              -> lista de categorías
// ============================================================
const express = require('express');
const cors = require('cors');
const db = require('./db');
const productosIniciales = require('./productos-iniciales');

const PORT = process.env.PORT || 3002;

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Base de datos ----------
async function prepararBaseDeDatos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS productos (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT NOT NULL,
      descripcion TEXT,
      precio      NUMERIC(10, 2) NOT NULL,
      categoria   TEXT NOT NULL,
      tallas      TEXT NOT NULL,      -- separadas por coma: "S,M,L"
      emoji       TEXT,
      imagen      TEXT
    )
  `);

  // Si la tabla está vacía, cargamos el catálogo inicial
  const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM productos');
  if (rows[0].total === 0) {
    for (const p of productosIniciales) {
      await db.query(
        `INSERT INTO productos (nombre, descripcion, precio, categoria, tallas, emoji, imagen)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [p.nombre, p.descripcion, p.precio, p.categoria, p.tallas, p.emoji, p.imagen]
      );
    }
    console.log(`Catálogo inicial cargado (${productosIniciales.length} productos)`);
  }
}

// Convierte "S,M,L" en ["S", "M", "L"] para que la app lo use fácil
function formatear(producto) {
  return { ...producto, tallas: producto.tallas.split(',') };
}

// ---------- Rutas ----------
app.get('/', (req, res) => {
  res.json({ servicio: 'productos', estado: 'ok' });
});

app.get('/productos', async (req, res) => {
  const { categoria } = req.query;
  const resultado = categoria
    ? await db.query('SELECT * FROM productos WHERE categoria = $1 ORDER BY id', [categoria])
    : await db.query('SELECT * FROM productos ORDER BY id');
  res.json(resultado.rows.map(formatear));
});

app.get('/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  const { rows } = await db.query('SELECT * FROM productos WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(formatear(rows[0]));
});

app.get('/categorias', async (req, res) => {
  const { rows } = await db.query('SELECT DISTINCT categoria FROM productos ORDER BY categoria');
  res.json(rows.map((r) => r.categoria));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------- Arranque ----------
prepararBaseDeDatos()
  .then(() => app.listen(PORT, () => console.log(`Servicio de productos en puerto ${PORT}`)))
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });

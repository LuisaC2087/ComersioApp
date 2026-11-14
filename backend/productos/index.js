// ============================================================
//  MICROSERVICIO DE PRODUCTOS
//
//  Público (la tienda):
//  - GET /productos               -> lista todo el catálogo
//  - GET /productos?categoria=X   -> filtra por categoría
//  - GET /productos/:id           -> un producto
//  - GET /categorias              -> lista de categorías
//
//  Solo administradores (token con rol "admin"):
//  - POST   /productos            -> crear producto
//  - PUT    /productos/:id        -> modificar producto (incluye stock e imagen)
//  - DELETE /productos/:id        -> eliminar producto
//
//  La imagen se guarda como texto: una URL (https://...) o la foto en
//  base64 (data:image/...). Así vive en la base de datos y no se pierde.
// ============================================================
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const productosIniciales = require('./productos-iniciales');

const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-local';

const app = express();
app.use(cors());
// Límite de 5mb porque las fotos en base64 ocupan más que un JSON normal
app.use(express.json({ limit: '5mb' }));

// Documentación interactiva de la API en /docs
const swaggerUi = require('swagger-ui-express');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(require('./swagger')));

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
      stock       INT NOT NULL DEFAULT 20,
      emoji       TEXT,
      imagen      TEXT
    )
  `);
  // Si la tabla ya existía sin "stock", se agrega sin borrar nada
  await db.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS stock INT NOT NULL DEFAULT 20`);

  // Si la tabla está vacía, cargamos el catálogo inicial
  const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM productos');
  if (rows[0].total === 0) {
    for (const p of productosIniciales) {
      await db.query(
        `INSERT INTO productos (nombre, descripcion, precio, categoria, tallas, stock, imagen)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [p.nombre, p.descripcion, p.precio, p.categoria, p.tallas, p.stock, p.imagen]
      );
    }
    console.log(`Catálogo inicial cargado (${productosIniciales.length} productos)`);
  }
}

// Convierte "S,M,L" en ["S","M","L"] para que la app lo use fácil
function formatear(p) {
  return { ...p, tallas: p.tallas.split(',') };
}

// Solo deja pasar a administradores (el rol viene dentro del token)
function soloAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });
  }
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ error: 'Solo el administrador puede hacer esto' });
  }
  next();
}

// Valida y normaliza los datos del formulario de producto
function validarProducto(cuerpo) {
  const { nombre, descripcion, precio, categoria, tallas, stock, imagen } = cuerpo;
  if (!nombre || !nombre.trim()) return { error: 'El nombre es obligatorio' };
  if (!categoria || !categoria.trim()) return { error: 'La categoría es obligatoria' };
  if (!(Number(precio) > 0)) return { error: 'El precio debe ser mayor que 0' };
  if (!Number.isInteger(Number(stock)) || Number(stock) < 0) return { error: 'El stock debe ser 0 o más' };

  // tallas puede llegar como ["S","M"] o como "S, M"
  const lista = (Array.isArray(tallas) ? tallas : String(tallas || '').split(','))
    .map((t) => String(t).trim())
    .filter(Boolean);
  if (lista.length === 0) return { error: 'Escribe al menos una talla' };

  return {
    datos: {
      nombre: nombre.trim(),
      descripcion: (descripcion || '').trim(),
      precio: Number(precio),
      categoria: categoria.trim(),
      tallas: lista.join(','),
      stock: Number(stock),
      imagen: imagen || null,
    },
  };
}

// ---------- Rutas públicas ----------
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

// ---------- Rutas de administrador ----------
app.post('/productos', soloAdmin, async (req, res) => {
  const { error, datos } = validarProducto(req.body);
  if (error) return res.status(400).json({ error });

  const { rows } = await db.query(
    `INSERT INTO productos (nombre, descripcion, precio, categoria, tallas, stock, imagen)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [datos.nombre, datos.descripcion, datos.precio, datos.categoria, datos.tallas, datos.stock, datos.imagen]
  );
  res.status(201).json(formatear(rows[0]));
});

app.put('/productos/:id', soloAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  const { error, datos } = validarProducto(req.body);
  if (error) return res.status(400).json({ error });

  const { rows } = await db.query(
    `UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, categoria=$4, tallas=$5, stock=$6, imagen=$7
     WHERE id=$8 RETURNING *`,
    [datos.nombre, datos.descripcion, datos.precio, datos.categoria, datos.tallas, datos.stock, datos.imagen, id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(formatear(rows[0]));
});

app.delete('/productos/:id', soloAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  const { rowCount } = await db.query('DELETE FROM productos WHERE id = $1', [id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json({ eliminado: true });
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

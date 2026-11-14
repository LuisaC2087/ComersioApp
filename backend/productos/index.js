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
//  - PUT    /productos/:id        -> modificar producto (tallas, stock e imagen)
//  - DELETE /productos/:id        -> eliminar producto
//
//  TABLAS
//   productos       -> datos generales (nombre, precio, categoría, imagen...)
//   producto_tallas -> una fila por talla con SU stock:
//                      (producto 1, "S", 5), (producto 1, "M", 0), ...
//
//  Cada producto se entrega así:
//   { id, nombre, precio, ..., tallas: [{ talla: "S", stock: 5 }, ...], stock: 5 }
//   ("stock" es la suma de todas las tallas, útil para mostrar "Agotado").
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
      imagen      TEXT
    )
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS producto_tallas (
      id          SERIAL PRIMARY KEY,               -- también sirve para ordenar las tallas
      producto_id INT NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
      talla       TEXT NOT NULL,
      stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
      UNIQUE (producto_id, talla)
    )
  `);

  await migrarVersionAnterior();

  // Si no hay productos, cargamos el catálogo inicial
  const { rows } = await db.query('SELECT COUNT(*)::int AS total FROM productos');
  if (rows[0].total === 0) {
    for (const p of productosIniciales) {
      await guardarProducto(db, null, p);
    }
    console.log(`Catálogo inicial cargado (${productosIniciales.length} productos)`);
  }
}

// La versión anterior guardaba "tallas" (texto "S,M,L") y un solo "stock" en la
// tabla productos. Si encontramos esas columnas, pasamos los datos a la tabla
// producto_tallas (cada talla recibe el stock que tenía el producto) y las borramos.
async function migrarVersionAnterior() {
  const { rows } = await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'tallas'`
  );
  if (rows.length === 0) return;

  const tieneStock = await db.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = 'productos' AND column_name = 'stock'`
  );
  const stockViejo = tieneStock.rows.length ? 'p.stock' : '10';

  await db.query(`
    INSERT INTO producto_tallas (producto_id, talla, stock)
    SELECT p.id, TRIM(t), ${stockViejo}
      FROM productos p, UNNEST(STRING_TO_ARRAY(p.tallas, ',')) AS t
     WHERE TRIM(t) <> ''
    ON CONFLICT (producto_id, talla) DO NOTHING
  `);
  await db.query(`ALTER TABLE productos DROP COLUMN IF EXISTS tallas, DROP COLUMN IF EXISTS stock, DROP COLUMN IF EXISTS emoji`);
  console.log('Migración: el stock ahora se guarda por talla');
}

// Consulta base: cada producto con su lista de tallas (en formato JSON) y el stock total
const SELECT_PRODUCTOS = `
  SELECT p.*,
         COALESCE(JSON_AGG(JSON_BUILD_OBJECT('talla', t.talla, 'stock', t.stock) ORDER BY t.id)
                  FILTER (WHERE t.id IS NOT NULL), '[]') AS tallas,
         COALESCE(SUM(t.stock), 0)::int AS stock
    FROM productos p
    LEFT JOIN producto_tallas t ON t.producto_id = p.id
`;

// Crea (id = null) o actualiza un producto con sus tallas.
// "conexion" puede ser la base de datos o una transacción en curso.
async function guardarProducto(conexion, id, datos) {
  const valores = [datos.nombre, datos.descripcion, datos.precio, datos.categoria, datos.imagen];
  let productoId = id;

  if (id) {
    const r = await conexion.query(
      `UPDATE productos SET nombre=$1, descripcion=$2, precio=$3, categoria=$4, imagen=$5 WHERE id=$6 RETURNING id`,
      [...valores, id]
    );
    if (r.rows.length === 0) return null;
    // Reemplazamos todas las tallas por las nuevas
    await conexion.query('DELETE FROM producto_tallas WHERE producto_id = $1', [id]);
  } else {
    const r = await conexion.query(
      `INSERT INTO productos (nombre, descripcion, precio, categoria, imagen) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      valores
    );
    productoId = r.rows[0].id;
  }

  for (const t of datos.tallas) {
    await conexion.query('INSERT INTO producto_tallas (producto_id, talla, stock) VALUES ($1, $2, $3)', [
      productoId,
      t.talla,
      t.stock,
    ]);
  }
  return productoId;
}

async function buscarProducto(id) {
  const { rows } = await db.query(`${SELECT_PRODUCTOS} WHERE p.id = $1 GROUP BY p.id`, [id]);
  return rows[0] || null;
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

// Valida y limpia los datos del formulario de producto.
// tallas debe llegar así: [{ talla: "S", stock: 5 }, { talla: "M", stock: 3 }]
function validarProducto(cuerpo) {
  const { nombre, descripcion, precio, categoria, tallas, imagen } = cuerpo;
  if (!nombre || !String(nombre).trim()) return { error: 'El nombre es obligatorio' };
  if (!categoria || !String(categoria).trim()) return { error: 'La categoría es obligatoria' };
  if (!(Number(precio) > 0)) return { error: 'El precio debe ser mayor que 0' };
  if (!Array.isArray(tallas) || tallas.length === 0) return { error: 'Agrega al menos una talla' };

  const lista = [];
  for (const t of tallas) {
    const talla = String(t.talla || '').trim();
    const stock = Number(t.stock);
    if (!talla) return { error: 'Cada talla necesita un nombre' };
    if (!Number.isInteger(stock) || stock < 0) return { error: `El stock de la talla ${talla} debe ser 0 o más` };
    if (lista.some((x) => x.talla === talla)) return { error: `La talla ${talla} está repetida` };
    lista.push({ talla, stock });
  }

  return {
    datos: {
      nombre: String(nombre).trim(),
      descripcion: String(descripcion || '').trim(),
      precio: Number(precio),
      categoria: String(categoria).trim(),
      imagen: imagen || null,
      tallas: lista,
    },
  };
}

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

// ---------- Rutas públicas ----------
app.get('/', (req, res) => {
  res.json({ servicio: 'productos', estado: 'ok' });
});

app.get('/productos', async (req, res) => {
  const { categoria } = req.query;
  const resultado = categoria
    ? await db.query(`${SELECT_PRODUCTOS} WHERE p.categoria = $1 GROUP BY p.id ORDER BY p.id`, [categoria])
    : await db.query(`${SELECT_PRODUCTOS} GROUP BY p.id ORDER BY p.id`);
  res.json(resultado.rows);
});

app.get('/productos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  const producto = await buscarProducto(id);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

app.get('/categorias', async (req, res) => {
  const { rows } = await db.query('SELECT DISTINCT categoria FROM productos ORDER BY categoria');
  res.json(rows.map((r) => r.categoria));
});

// ---------- Rutas de administrador ----------
app.post('/productos', soloAdmin, async (req, res) => {
  const { error, datos } = validarProducto(req.body);
  if (error) return res.status(400).json({ error });

  const id = await enTransaccion((cliente) => guardarProducto(cliente, null, datos));
  res.status(201).json(await buscarProducto(id));
});

app.put('/productos/:id', soloAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  const { error, datos } = validarProducto(req.body);
  if (error) return res.status(400).json({ error });

  const actualizado = await enTransaccion((cliente) => guardarProducto(cliente, id, datos));
  if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(await buscarProducto(id));
});

app.delete('/productos/:id', soloAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id inválido' });

  // Las tallas se borran solas (ON DELETE CASCADE)
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

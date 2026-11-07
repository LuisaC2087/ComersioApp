// ============================================================
//  MICROSERVICIO DE USUARIOS
//  - POST /registro  -> crea una cuenta y devuelve un token
//  - POST /login     -> valida email/contraseña y devuelve un token
//  - GET  /perfil    -> datos del usuario dueño del token
// ============================================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'secreto-local';

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Base de datos ----------
async function prepararBaseDeDatos() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id        SERIAL PRIMARY KEY,
      nombre    TEXT NOT NULL,
      email     TEXT UNIQUE NOT NULL,
      password  TEXT NOT NULL,
      creado_en TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Usuario de prueba para la demo: demo@tienda.com / 123456
  const hash = await bcrypt.hash('123456', 10);
  await db.query(
    `INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING`,
    ['Usuario Demo', 'demo@tienda.com', hash]
  );
}

// ---------- Utilidades ----------
// El token guarda id, nombre y email. Los otros microservicios lo leen
// con el mismo JWT_SECRET para saber quién hace la petición.
function crearToken(usuario) {
  return jwt.sign(
    { id: usuario.id, nombre: usuario.nombre, email: usuario.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function autenticar(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.usuario = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Sesión inválida, inicia sesión de nuevo' });
  }
}

// ---------- Rutas ----------
app.get('/', (req, res) => {
  res.json({ servicio: 'usuarios', estado: 'ok' });
});

app.post('/registro', async (req, res) => {
  const { nombre, email, password } = req.body;

  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'Nombre, email y contraseña son obligatorios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
  }

  const correo = email.trim().toLowerCase();
  const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [correo]);
  if (existe.rows.length > 0) {
    return res.status(409).json({ error: 'Ese email ya está registrado' });
  }

  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    'INSERT INTO usuarios (nombre, email, password) VALUES ($1, $2, $3) RETURNING id, nombre, email',
    [nombre.trim(), correo, hash]
  );

  const usuario = rows[0];
  res.status(201).json({ token: crearToken(usuario), usuario });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
  }

  const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [
    email.trim().toLowerCase(),
  ]);
  const usuario = rows[0];

  const valido = usuario && (await bcrypt.compare(password, usuario.password));
  if (!valido) {
    return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  }

  const datos = { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
  res.json({ token: crearToken(datos), usuario: datos });
});

app.get('/perfil', autenticar, async (req, res) => {
  const { rows } = await db.query(
    'SELECT id, nombre, email, creado_en FROM usuarios WHERE id = $1',
    [req.usuario.id]
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
});

// Cualquier error no controlado responde 500 en formato JSON
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ---------- Arranque ----------
prepararBaseDeDatos()
  .then(() => app.listen(PORT, () => console.log(`Servicio de usuarios en puerto ${PORT}`)))
  .catch((err) => {
    console.error('No se pudo conectar a la base de datos:', err.message);
    process.exit(1);
  });

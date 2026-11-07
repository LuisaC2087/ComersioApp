// Conexión a PostgreSQL (la base de datos en línea de Render).
const { Pool } = require('pg');

// DATABASE_URL: la URL de la base de datos (en Render se configura en Environment).
const url = process.env.DATABASE_URL;

// DATABASE_SSL=true o false lo fuerza. Si no se define, se activa solo
// con la URL externa de Render (la que usas desde tu PC).
const usarSsl = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL === 'true'
  : Boolean(url && url.includes('render.com'));

const db = new Pool({
  connectionString: url,
  ssl: usarSsl ? { rejectUnauthorized: false } : false,
});

module.exports = db;

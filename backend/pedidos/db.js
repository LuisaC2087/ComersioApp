// Conexión a PostgreSQL (la base de datos en línea de Render).
const { Pool, types } = require('pg');

// PostgreSQL devuelve los NUMERIC (precios) como texto; los convertimos a número.
types.setTypeParser(1700, parseFloat);

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

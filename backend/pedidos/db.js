// Conexión a PostgreSQL (la base de datos en línea de Render).
const { Pool, types } = require('pg');

// PostgreSQL devuelve los NUMERIC (precios) como texto; los convertimos a número.
types.setTypeParser(1700, parseFloat);

const url = process.env.DATABASE_URL;

const db = new Pool({
  connectionString: url,
  // La URL "externa" de Render (la que usas desde tu PC) exige SSL.
  ssl: url && url.includes('render.com') ? { rejectUnauthorized: false } : false,
});

module.exports = db;

// Conexión a PostgreSQL (la base de datos en línea de Render).
const { Pool } = require('pg');

const url = process.env.DATABASE_URL;

const db = new Pool({
  connectionString: url,
  // La URL "externa" de Render (la que usas desde tu PC) exige SSL.
  // La URL "interna" (la que usan los servicios dentro de Render) no.
  ssl: url && url.includes('render.com') ? { rejectUnauthorized: false } : false,
});

module.exports = db;

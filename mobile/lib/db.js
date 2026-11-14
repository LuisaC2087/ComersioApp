// ============================================================
//  BASE DE DATOS LOCAL (SQLite dentro del celular)
//
//  Guarda:
//   - sesion : el token y los datos del usuario (para no pedir login cada vez)
//   - cache  : copias del catálogo, carrito, historial y facturas para
//              verlos aunque no haya internet
//
//  El carrito "oficial" vive en el servidor (porque reserva stock que
//  comparten todos los clientes); aquí solo se guarda una copia.
// ============================================================
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('tienda.db');

// Se ejecuta una sola vez, al importar este archivo
db.execSync(`
  CREATE TABLE IF NOT EXISTS sesion (
    id      INTEGER PRIMARY KEY CHECK (id = 1),
    token   TEXT NOT NULL,
    usuario TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS cache (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );

  -- La versión anterior guardaba el carrito aquí; ya no se usa
  DROP TABLE IF EXISTS carrito;
`);

// ---------- Sesión ----------
export function guardarSesion(token, usuario) {
  db.runSync('INSERT OR REPLACE INTO sesion (id, token, usuario) VALUES (1, ?, ?)', [
    token,
    JSON.stringify(usuario),
  ]);
}

export function leerSesion() {
  const fila = db.getFirstSync('SELECT * FROM sesion WHERE id = 1');
  return fila ? { token: fila.token, usuario: JSON.parse(fila.usuario) } : null;
}

export function borrarSesion() {
  db.runSync('DELETE FROM sesion');
}

// ---------- Caché (para modo sin conexión) ----------
// Ejemplos de claves: 'productos', 'carrito', 'historial', 'pedido-12', 'banners'
export function guardarCache(clave, valor) {
  db.runSync('INSERT OR REPLACE INTO cache (clave, valor) VALUES (?, ?)', [
    clave,
    JSON.stringify(valor),
  ]);
}

export function leerCache(clave) {
  const fila = db.getFirstSync('SELECT valor FROM cache WHERE clave = ?', [clave]);
  return fila ? JSON.parse(fila.valor) : null;
}

export function borrarCache() {
  db.runSync('DELETE FROM cache');
}

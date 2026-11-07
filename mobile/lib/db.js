// ============================================================
//  BASE DE DATOS LOCAL (SQLite dentro del celular)
//
//  Guarda:
//   - sesion  : el token y los datos del usuario (para no pedir login cada vez)
//   - carrito : los productos que el usuario va agregando
//   - cache   : copia del catálogo, historial y facturas para verlos sin internet
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

  CREATE TABLE IF NOT EXISTS carrito (
    producto_id INTEGER NOT NULL,
    talla       TEXT NOT NULL,
    nombre      TEXT NOT NULL,
    precio      REAL NOT NULL,
    emoji       TEXT,
    imagen      TEXT,
    cantidad    INTEGER NOT NULL,
    PRIMARY KEY (producto_id, talla)
  );

  CREATE TABLE IF NOT EXISTS cache (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL
  );
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

// ---------- Carrito ----------
export function agregarAlCarrito(producto, talla, cantidad) {
  // Si el producto con esa talla ya está, solo sumamos la cantidad
  db.runSync(
    `INSERT INTO carrito (producto_id, talla, nombre, precio, emoji, imagen, cantidad)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (producto_id, talla) DO UPDATE SET cantidad = cantidad + excluded.cantidad`,
    [producto.id, talla, producto.nombre, producto.precio, producto.emoji, producto.imagen, cantidad]
  );
}

export function leerCarrito() {
  return db.getAllSync('SELECT * FROM carrito ORDER BY nombre');
}

export function cambiarCantidad(productoId, talla, cantidad) {
  if (cantidad <= 0) {
    db.runSync('DELETE FROM carrito WHERE producto_id = ? AND talla = ?', [productoId, talla]);
  } else {
    db.runSync('UPDATE carrito SET cantidad = ? WHERE producto_id = ? AND talla = ?', [
      cantidad,
      productoId,
      talla,
    ]);
  }
}

export function vaciarCarrito() {
  db.runSync('DELETE FROM carrito');
}

// ---------- Caché (para modo sin conexión) ----------
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

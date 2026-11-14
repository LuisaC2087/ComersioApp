// ============================================================
//  BASE DE DATOS LOCAL — VERSIÓN NAVEGADOR
//
//  Expo usa automáticamente este archivo en la web y "db.js" (SQLite)
//  en el celular. Tiene EXACTAMENTE las mismas funciones, pero guarda
//  los datos en el localStorage del navegador.
// ============================================================

const leer = (clave, porDefecto) => {
  try {
    const valor = localStorage.getItem(clave);
    return valor ? JSON.parse(valor) : porDefecto;
  } catch {
    return porDefecto;
  }
};
const escribir = (clave, valor) => localStorage.setItem(clave, JSON.stringify(valor));

// ---------- Sesión ----------
export function guardarSesion(token, usuario) {
  escribir('sesion', { token, usuario });
}

export function leerSesion() {
  return leer('sesion', null);
}

export function borrarSesion() {
  localStorage.removeItem('sesion');
}

// ---------- Caché ----------
export function guardarCache(clave, valor) {
  escribir('cache-' + clave, valor);
}

export function leerCache(clave) {
  return leer('cache-' + clave, null);
}

export function borrarCache() {
  Object.keys(localStorage)
    .filter((k) => k.startsWith('cache-'))
    .forEach((k) => localStorage.removeItem(k));
}

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

// ---------- Carrito ----------
export function agregarAlCarrito(producto, talla, cantidad) {
  const carrito = leerCarrito();
  const existente = carrito.find((i) => i.producto_id === producto.id && i.talla === talla);
  if (existente) {
    existente.cantidad += cantidad;
  } else {
    carrito.push({
      producto_id: producto.id,
      talla,
      nombre: producto.nombre,
      precio: producto.precio,
      emoji: producto.emoji,
      imagen: producto.imagen,
      cantidad,
    });
  }
  escribir('carrito', carrito);
}

export function leerCarrito() {
  return leer('carrito', []).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export function cambiarCantidad(productoId, talla, cantidad) {
  const carrito = leerCarrito()
    .map((i) => (i.producto_id === productoId && i.talla === talla ? { ...i, cantidad } : i))
    .filter((i) => i.cantidad > 0);
  escribir('carrito', carrito);
}

export function vaciarCarrito() {
  localStorage.removeItem('carrito');
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

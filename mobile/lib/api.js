// ============================================================
//  COMUNICACIÓN CON LOS MICROSERVICIOS
//  Cada función llama a uno de los 3 servicios desplegados en Render.
// ============================================================
import { API } from './config';

// Función base: hace la petición y devuelve el JSON, o lanza un error legible
async function pedir(url, { metodo = 'GET', cuerpo, token } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw new Error('No hay conexión con el servidor');
  }

  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const error = new Error(datos.error || 'Ocurrió un error, intenta de nuevo');
    error.status = respuesta.status; // 401 = sesión vencida
    throw error;
  }
  return datos;
}

// ---------- Servicio de usuarios ----------
export const login = (email, password) =>
  pedir(`${API.usuarios}/login`, { metodo: 'POST', cuerpo: { email, password } });

export const registrar = (nombre, email, password) =>
  pedir(`${API.usuarios}/registro`, { metodo: 'POST', cuerpo: { nombre, email, password } });

// ---------- Servicio de productos ----------
// Todos consultan la tabla "productos" de PostgreSQL a través del microservicio
export const obtenerProductos = (categoria) =>
  pedir(`${API.productos}/productos${categoria ? `?categoria=${encodeURIComponent(categoria)}` : ''}`);

export const obtenerProducto = (id) => pedir(`${API.productos}/productos/${id}`);

export const obtenerCategorias = () => pedir(`${API.productos}/categorias`);

// Banners del carrusel de inicio (todos = true incluye los ocultos, para el admin)
export const obtenerBanners = (todos) => pedir(`${API.productos}/banners${todos ? '?todos=1' : ''}`);

export const obtenerBanner = (id) => pedir(`${API.productos}/banners/${id}`);

// ---------- Servicio de pedidos: carrito ----------
// El carrito vive en el servidor: al agregar, el stock se RESERVA (se descuenta);
// al quitar, vuelve al stock. Todas devuelven { items, minutosReserva, venceEn }.
export const obtenerCarrito = (token) => pedir(`${API.pedidos}/carrito`, { token });

export const agregarAlCarrito = (token, productoId, talla, cantidad) =>
  pedir(`${API.pedidos}/carrito`, { metodo: 'POST', cuerpo: { productoId, talla, cantidad }, token });

// cantidad = 0 quita el producto del carrito
export const cambiarCantidadCarrito = (token, productoId, talla, cantidad) =>
  pedir(`${API.pedidos}/carrito`, { metodo: 'PUT', cuerpo: { productoId, talla, cantidad }, token });

// ---------- Servicio de pedidos: compras ----------
// Paga lo que hay en el carrito. pago: { titular, numeroTarjeta, vencimiento, cvv }
export const crearPedido = (token, pago) =>
  pedir(`${API.pedidos}/pedidos`, { metodo: 'POST', cuerpo: { pago }, token });

export const obtenerHistorial = (token) => pedir(`${API.pedidos}/pedidos`, { token });

export const obtenerPedido = (token, id) => pedir(`${API.pedidos}/pedidos/${id}`, { token });

// ---------- Funciones solo del administrador ----------
export const crearProducto = (token, datos) =>
  pedir(`${API.productos}/productos`, { metodo: 'POST', cuerpo: datos, token });

export const actualizarProducto = (token, id, datos) =>
  pedir(`${API.productos}/productos/${id}`, { metodo: 'PUT', cuerpo: datos, token });

export const eliminarProducto = (token, id) =>
  pedir(`${API.productos}/productos/${id}`, { metodo: 'DELETE', token });

export const crearBanner = (token, datos) =>
  pedir(`${API.productos}/banners`, { metodo: 'POST', cuerpo: datos, token });

export const actualizarBanner = (token, id, datos) =>
  pedir(`${API.productos}/banners/${id}`, { metodo: 'PUT', cuerpo: datos, token });

export const eliminarBanner = (token, id) =>
  pedir(`${API.productos}/banners/${id}`, { metodo: 'DELETE', token });

export const obtenerPedidosAdmin = (token) => pedir(`${API.pedidos}/admin/pedidos`, { token });

export const cambiarEstadoPedido = (token, id, estado) =>
  pedir(`${API.pedidos}/admin/pedidos/${id}`, { metodo: 'PUT', cuerpo: { estado }, token });

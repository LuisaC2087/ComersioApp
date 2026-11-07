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

// ---------- Servicio de pedidos ----------
// items: [{ productoId, talla, cantidad }]
// pago:  { titular, numeroTarjeta, vencimiento, cvv }
export const crearPedido = (token, items, pago) =>
  pedir(`${API.pedidos}/pedidos`, { metodo: 'POST', cuerpo: { items, pago }, token });

export const obtenerHistorial = (token) => pedir(`${API.pedidos}/pedidos`, { token });

export const obtenerPedido = (token, id) => pedir(`${API.pedidos}/pedidos/${id}`, { token });

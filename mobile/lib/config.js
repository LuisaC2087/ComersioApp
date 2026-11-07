// ============================================================
//  CONFIGURACIÓN DE LA APP  (lo que más vas a querer cambiar)
// ============================================================

// URLs de los 3 microservicios desplegados en Render.
// Para probar con los servicios corriendo en tu PC, usa la IP de tu PC
// (no "localhost", porque el celular es otro dispositivo), por ejemplo:
//   usuarios: 'http://192.168.1.50:3001',
export const API = {
  usuarios: 'https://tienda-usuarios.onrender.com',
  productos: 'https://tienda-productos.onrender.com',
  pedidos: 'https://tienda-pedidos.onrender.com',
};

// Datos que aparecen en la factura
export const TIENDA = {
  nombre: 'Glass Store',
  nit: '1234567-8',
  direccion: 'Ciudad de Guatemala',
  telefono: '+502 2222-3333',
};

export const MONEDA = 'Q';

// Solo para mostrar un estimado en el carrito.
// El cálculo final lo hace el microservicio de pedidos.
export const IVA = 0.12;

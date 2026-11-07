// ============================================================
//  CONFIGURACIÓN DE LA APP (todo sale de variables de entorno)
//
//  - En Render: servicio "tienda-web" > Environment.
//    OJO: después de cambiar una variable hay que volver a desplegar
//    (Manual Deploy > Clear build cache & deploy), porque Expo
//    copia estos valores dentro de la app al compilarla.
//  - En tu PC: copia "mobile/.env.example" como "mobile/.env".
//
//  Solo las variables que empiezan con EXPO_PUBLIC_ llegan a la app.
//  Si una variable no existe, se usa el valor que está después de "||".
// ============================================================

export const API = {
  usuarios: process.env.EXPO_PUBLIC_USUARIOS_URL || 'https://tienda-usuarios.onrender.com',
  productos: process.env.EXPO_PUBLIC_PRODUCTOS_URL || 'https://tienda-productos-dxd5.onrender.com',
  pedidos: process.env.EXPO_PUBLIC_PEDIDOS_URL || 'https://tienda-pedidos-brue.onrender.com',
};

// Datos que aparecen en la factura
export const TIENDA = {
  nombre: process.env.EXPO_PUBLIC_TIENDA_NOMBRE || 'Glass Store',
  nit: process.env.EXPO_PUBLIC_TIENDA_NIT || '1234567-8',
  direccion: process.env.EXPO_PUBLIC_TIENDA_DIRECCION || 'Ciudad de Guatemala',
  telefono: process.env.EXPO_PUBLIC_TIENDA_TELEFONO || '+502 2222-3333',
};

export const MONEDA = process.env.EXPO_PUBLIC_MONEDA || 'Q';

// Solo para mostrar un estimado en el carrito.
// El cálculo final lo hace el microservicio de pedidos (variable IVA en Render).
export const IVA = Number(process.env.EXPO_PUBLIC_IVA || 0.12);

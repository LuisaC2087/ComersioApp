// Productos que se cargan la primera vez que arranca el servicio (solo si la
// tabla está vacía). Después, los productos se administran desde la app
// (sección de administrador) y viven en la base de datos.
//
// tallas: { talla: stock }  ->  { S: 5, M: 8 } significa 5 en talla S y 8 en M.
// imagen: una URL https, o null (la app muestra un ícono hasta que subas la foto).
const productos = [
  { nombre: 'Camisa Oxford', descripcion: 'Camisa de algodón de manga larga, corte clásico.', precio: 189.0, categoria: 'Camisas', tallas: { S: 5, M: 8, L: 6, XL: 3 } },
  { nombre: 'Camiseta Básica', descripcion: 'Camiseta 100% algodón, cuello redondo.', precio: 79.0, categoria: 'Camisas', tallas: { S: 10, M: 12, L: 10, XL: 6 } },
  { nombre: 'Polo Sport', descripcion: 'Polo transpirable ideal para el día a día.', precio: 129.0, categoria: 'Camisas', tallas: { S: 4, M: 6, L: 0 } },
  { nombre: 'Jeans Slim', descripcion: 'Pantalón de mezclilla elástico, corte slim.', precio: 249.0, categoria: 'Pantalones', tallas: { 28: 3, 30: 5, 32: 6, 34: 4, 36: 2 } },
  { nombre: 'Short Casual', descripcion: 'Short ligero de lino para clima cálido.', precio: 119.0, categoria: 'Pantalones', tallas: { S: 8, M: 9, L: 7 } },
  { nombre: 'Vestido Floral', descripcion: 'Vestido midi con estampado de flores.', precio: 299.0, categoria: 'Vestidos', tallas: { XS: 2, S: 4, M: 3, L: 1 } },
  { nombre: 'Vestido de Noche', descripcion: 'Vestido largo elegante para eventos.', precio: 459.0, categoria: 'Vestidos', tallas: { XS: 1, S: 2, M: 2, L: 0 } },
  { nombre: 'Chaqueta de Abrigo', descripcion: 'Chaqueta acolchada impermeable.', precio: 499.0, categoria: 'Abrigos', tallas: { S: 2, M: 3, L: 2, XL: 1 } },
  { nombre: 'Tenis Urbanos', descripcion: 'Tenis cómodos con suela de goma.', precio: 389.0, categoria: 'Calzado', tallas: { 37: 3, 38: 4, 39: 5, 40: 5, 41: 3, 42: 2 } },
  { nombre: 'Botas de Cuero', descripcion: 'Botas de cuero genuino, media caña.', precio: 549.0, categoria: 'Calzado', tallas: { 37: 1, 38: 2, 39: 1, 40: 2, 41: 1, 42: 0 } },
  { nombre: 'Gorra Clásica', descripcion: 'Gorra ajustable de algodón.', precio: 69.0, categoria: 'Accesorios', tallas: { Única: 30 } },
  { nombre: 'Bufanda de Lana', descripcion: 'Bufanda suave y abrigadora.', precio: 89.0, categoria: 'Accesorios', tallas: { Única: 12 } },
];

// Convertimos { S: 5 } al formato que usa el servicio: [{ talla: 'S', stock: 5 }]
module.exports = productos.map((p) => ({
  ...p,
  imagen: null,
  tallas: Object.entries(p.tallas).map(([talla, stock]) => ({ talla, stock })),
}));

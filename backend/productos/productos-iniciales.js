// Productos que se cargan la primera vez que arranca el servicio (solo si la
// tabla está vacía). Después, los productos se administran desde la app
// (sección de administrador) y viven en la base de datos.
// "imagen" puede ser una URL https o quedar en null (la app muestra un ícono).
module.exports = [
  { nombre: 'Camisa Oxford', descripcion: 'Camisa de algodón de manga larga, corte clásico.', precio: 189.0, categoria: 'Camisas', tallas: 'S,M,L,XL', stock: 20, imagen: null },
  { nombre: 'Camiseta Básica', descripcion: 'Camiseta 100% algodón, cuello redondo.', precio: 79.0, categoria: 'Camisas', tallas: 'S,M,L,XL', stock: 40, imagen: null },
  { nombre: 'Polo Sport', descripcion: 'Polo transpirable ideal para el día a día.', precio: 129.0, categoria: 'Camisas', tallas: 'S,M,L', stock: 15, imagen: null },
  { nombre: 'Jeans Slim', descripcion: 'Pantalón de mezclilla elástico, corte slim.', precio: 249.0, categoria: 'Pantalones', tallas: '28,30,32,34,36', stock: 18, imagen: null },
  { nombre: 'Short Casual', descripcion: 'Short ligero de lino para clima cálido.', precio: 119.0, categoria: 'Pantalones', tallas: 'S,M,L', stock: 25, imagen: null },
  { nombre: 'Vestido Floral', descripcion: 'Vestido midi con estampado de flores.', precio: 299.0, categoria: 'Vestidos', tallas: 'XS,S,M,L', stock: 10, imagen: null },
  { nombre: 'Vestido de Noche', descripcion: 'Vestido largo elegante para eventos.', precio: 459.0, categoria: 'Vestidos', tallas: 'XS,S,M,L', stock: 6, imagen: null },
  { nombre: 'Chaqueta de Abrigo', descripcion: 'Chaqueta acolchada impermeable.', precio: 499.0, categoria: 'Abrigos', tallas: 'S,M,L,XL', stock: 8, imagen: null },
  { nombre: 'Tenis Urbanos', descripcion: 'Tenis cómodos con suela de goma.', precio: 389.0, categoria: 'Calzado', tallas: '37,38,39,40,41,42', stock: 22, imagen: null },
  { nombre: 'Botas de Cuero', descripcion: 'Botas de cuero genuino, media caña.', precio: 549.0, categoria: 'Calzado', tallas: '37,38,39,40,41,42', stock: 7, imagen: null },
  { nombre: 'Gorra Clásica', descripcion: 'Gorra ajustable de algodón.', precio: 69.0, categoria: 'Accesorios', tallas: 'Única', stock: 30, imagen: null },
  { nombre: 'Bufanda de Lana', descripcion: 'Bufanda suave y abrigadora.', precio: 89.0, categoria: 'Accesorios', tallas: 'Única', stock: 12, imagen: null },
];

// Documentación OpenAPI del servicio de productos.
// Se publica en /docs con Swagger UI (interfaz para probar la API).
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Servicio de Productos',
    version: '1.0.0',
    description:
      'Catálogo de la tienda. Las rutas de escritura (crear, modificar, eliminar) requieren un token de administrador del servicio de usuarios.',
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Talla: {
        type: 'object',
        properties: {
          talla: { type: 'string', example: 'M' },
          stock: { type: 'integer', example: 5 },
        },
      },
      Producto: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Camisa Oxford' },
          descripcion: { type: 'string', example: 'Camisa de algodón de manga larga.' },
          precio: { type: 'number', example: 189.0 },
          categoria: { type: 'string', example: 'Camisas' },
          tallas: { type: 'array', items: { $ref: '#/components/schemas/Talla' } },
          stock: { type: 'integer', example: 8, description: 'Suma del stock de todas las tallas' },
          imagen: { type: 'string', nullable: true, description: 'URL https o foto en base64 (data:image/...)' },
        },
      },
      ProductoNuevo: {
        type: 'object',
        required: ['nombre', 'precio', 'categoria', 'tallas'],
        properties: {
          nombre: { type: 'string', example: 'Camisa Oxford' },
          descripcion: { type: 'string', example: 'Camisa de algodón.' },
          precio: { type: 'number', example: 189.0 },
          categoria: { type: 'string', example: 'Camisas' },
          tallas: { type: 'array', items: { $ref: '#/components/schemas/Talla' }, description: 'Cada talla con su propio stock' },
          imagen: { type: 'string', nullable: true },
        },
      },
      Error: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  paths: {
    '/': {
      get: { summary: 'Estado del servicio', responses: { 200: { description: 'ok' } } },
    },
    '/productos': {
      get: {
        summary: 'Listar el catálogo',
        parameters: [
          { name: 'categoria', in: 'query', required: false, schema: { type: 'string' }, example: 'Camisas' },
        ],
        responses: {
          200: { description: 'Lista de productos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Producto' } } } } },
        },
      },
      post: {
        summary: 'Crear un producto (solo admin)',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductoNuevo' } } } },
        responses: {
          201: { description: 'Producto creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } } },
          400: { description: 'Datos inválidos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'No es administrador', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/productos/{id}': {
      get: {
        summary: 'Ver un producto',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Producto', content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } } },
          404: { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      put: {
        summary: 'Modificar un producto, el stock de sus tallas o su imagen (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductoNuevo' } } } },
        responses: {
          200: { description: 'Producto actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Producto' } } } },
          403: { description: 'No es administrador', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        summary: 'Eliminar un producto (solo admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Eliminado' },
          403: { description: 'No es administrador', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          404: { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/categorias': {
      get: {
        summary: 'Listar las categorías',
        responses: {
          200: { description: 'Nombres de categoría', content: { 'application/json': { schema: { type: 'array', items: { type: 'string' }, example: ['Camisas', 'Calzado'] } } } },
        },
      },
    },
  },
};

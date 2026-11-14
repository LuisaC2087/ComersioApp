// Documentación OpenAPI del servicio de pedidos.
// Se publica en /docs con Swagger UI (interfaz para probar la API).
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Servicio de Pedidos',
    version: '1.0.0',
    description:
      'Compras con pago simulado, facturas e historial. Al comprar se descuenta el stock y se usan los precios reales de la base de datos. Todas las rutas requieren token.',
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Item: {
        type: 'object',
        properties: {
          producto_id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Camisa Oxford' },
          talla: { type: 'string', example: 'M' },
          cantidad: { type: 'integer', example: 2 },
          precio: { type: 'number', example: 189.0 },
        },
      },
      Pedido: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          numero_factura: { type: 'string', example: 'FAC-000001' },
          cliente_nombre: { type: 'string', example: 'Usuario Demo' },
          cliente_email: { type: 'string', example: 'demo@tienda.com' },
          subtotal: { type: 'number', example: 378.0 },
          impuesto: { type: 'number', example: 45.36 },
          total: { type: 'number', example: 423.36 },
          metodo_pago: { type: 'string', example: 'Tarjeta **** 1111' },
          referencia_pago: { type: 'string', example: 'AUT-123456' },
          estado: { type: 'string', enum: ['pagado', 'enviado', 'entregado', 'cancelado'] },
          fecha: { type: 'string', format: 'date-time' },
          items: { type: 'array', items: { $ref: '#/components/schemas/Item' } },
        },
      },
      CompraNueva: {
        type: 'object',
        required: ['items', 'pago'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productoId', 'talla', 'cantidad'],
              properties: {
                productoId: { type: 'integer', example: 1 },
                talla: { type: 'string', example: 'M' },
                cantidad: { type: 'integer', example: 2 },
              },
            },
          },
          pago: {
            type: 'object',
            required: ['titular', 'numeroTarjeta', 'vencimiento', 'cvv'],
            properties: {
              titular: { type: 'string', example: 'Usuario Demo' },
              numeroTarjeta: { type: 'string', example: '4111 1111 1111 1111', description: 'Si termina en 0000 el pago se rechaza (simulado)' },
              vencimiento: { type: 'string', example: '12/28' },
              cvv: { type: 'string', example: '123' },
            },
          },
        },
      },
      Error: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/': {
      get: { summary: 'Estado del servicio', security: [], responses: { 200: { description: 'ok' } } },
    },
    '/pedidos': {
      post: {
        summary: 'Comprar: descuenta stock, simula el pago y guarda la factura',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/CompraNueva' } } } },
        responses: {
          201: { description: 'Compra realizada (factura)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pedido' } } } },
          402: { description: 'Pago rechazado (simulado)', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'Sin stock suficiente en esa talla', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        summary: 'Historial de compras del usuario del token',
        responses: {
          200: { description: 'Pedidos del usuario', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pedido' } } } } },
        },
      },
    },
    '/pedidos/{id}': {
      get: {
        summary: 'Detalle de una compra (la factura)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Factura', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pedido' } } } },
          404: { description: 'No encontrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/admin/pedidos': {
      get: {
        summary: 'Todos los pedidos de la tienda (solo admin)',
        responses: {
          200: { description: 'Todos los pedidos', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Pedido' } } } } },
          403: { description: 'No es administrador', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/admin/pedidos/{id}': {
      put: {
        summary: 'Cambiar el estado de un pedido (solo admin)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['estado'],
                properties: { estado: { type: 'string', enum: ['pagado', 'enviado', 'entregado', 'cancelado'] } },
              },
            },
          },
        },
        responses: {
          200: { description: 'Pedido actualizado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Pedido' } } } },
          400: { description: 'Estado inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'No es administrador', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};

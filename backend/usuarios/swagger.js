// Documentación OpenAPI del servicio de usuarios.
// Se publica en /docs con Swagger UI (interfaz para probar la API).
module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Servicio de Usuarios',
    version: '1.0.0',
    description: 'Registro, inicio de sesión y perfil. Devuelve tokens JWT que usan los demás servicios.',
  },
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Usuario: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          nombre: { type: 'string', example: 'Ana López' },
          email: { type: 'string', example: 'ana@test.com' },
          rol: { type: 'string', enum: ['cliente', 'admin'], example: 'cliente' },
        },
      },
      Sesion: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'JWT para el header Authorization: Bearer <token>' },
          usuario: { $ref: '#/components/schemas/Usuario' },
        },
      },
      Error: { type: 'object', properties: { error: { type: 'string' } } },
    },
  },
  paths: {
    '/': {
      get: {
        summary: 'Estado del servicio',
        responses: { 200: { description: 'ok' } },
      },
    },
    '/registro': {
      post: {
        summary: 'Crear una cuenta (rol cliente)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nombre', 'email', 'password'],
                properties: {
                  nombre: { type: 'string', example: 'Ana López' },
                  email: { type: 'string', example: 'ana@test.com' },
                  password: { type: 'string', example: 'abcdef', minLength: 6 },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'Cuenta creada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sesion' } } } },
          400: { description: 'Datos incompletos', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          409: { description: 'El email ya está registrado', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/login': {
      post: {
        summary: 'Iniciar sesión',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', example: 'demo@tienda.com' },
                  password: { type: 'string', example: '123456' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Sesión iniciada', content: { 'application/json': { schema: { $ref: '#/components/schemas/Sesion' } } } },
          401: { description: 'Credenciales incorrectas', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
    '/perfil': {
      get: {
        summary: 'Datos del usuario dueño del token',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Perfil', content: { 'application/json': { schema: { $ref: '#/components/schemas/Usuario' } } } },
          401: { description: 'Token inválido', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    },
  },
};

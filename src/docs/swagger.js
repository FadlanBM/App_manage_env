import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auth API — Multi-App',
      version: '3.0.0',
      description: 'Multi-app authentication REST API with dual-token JWT (access + refresh)',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development server' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Admin JWT token',
        },
        appCredentials: {
          type: 'apiKey',
          in: 'header',
          name: 'X-App-Id',
          description: 'App UUID (id from POST /api/admin/apps) + X-App-Secret',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string', example: 'Error description' },
            data: { type: 'object', nullable: true, example: null },
          },
        },
        Admin: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'user'] },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        App: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            appId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        SecretItem: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            key: { type: 'string' },
            value: { type: 'string' },
            appId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Admin Auth', description: 'Admin authentication endpoints' },
      { name: 'Admin Apps', description: 'Admin app management' },
      { name: 'Admin Secrets', description: 'Admin secret management' },
      { name: 'Client', description: 'Client app endpoints' },
    ],
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

export default swaggerJsdoc(options);

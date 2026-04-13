const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Education OTT Platform API',
      version: '1.0.0',
      description: 'API documentation for the Education OTT Platform backend',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000/api/v1',
        description: 'Local Development Server',
      },
      {
        url: 'https://api.example.com/api/v1',
        description: 'Production Server',
      },
    ],
    tags: [
      { name: 'Auth', description: 'Xác thực người dùng' },
      { name: 'Users', description: 'Quản lý người dùng (Admin)' },
      { name: 'Classes', description: 'Quản lý lớp học' },
      { name: 'Groups', description: 'Quản lý nhóm trong lớp' },
      { name: 'Messages', description: 'Quản lý tin nhắn' },
      { name: 'Files', description: 'Upload và quản lý file' },
      { name: 'Analytics', description: 'Thống kê và phân tích' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  // Path to the API docs
  apis: ['./src/routes/*.js'], 
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

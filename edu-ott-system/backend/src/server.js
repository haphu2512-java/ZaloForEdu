require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');

const connectDB = require('./config/database');
const errorHandler = require('./middlewares/errorHandler');
const routes = require('./routes');
const { initializeSocket } = require('./socket');

const app = express();
const server = http.createServer(app);

connectDB();

const io = new Server(server, {
  cors: {
    origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
});
initializeSocket(io);
app.set('io', io);

app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

const corsOptions = {
  origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1', routes);

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Education OTT Platform API - Nhóm 03',
    version: '1.0.0',
    description: 'Tài liệu API đầy đủ cho hệ thống Zalo Giáo Dục'
  },
  servers: [{ url: 'http://localhost:5000/api/v1' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  paths: {
    // --- 1. AUTH ---
    '/auth/register': { post: { tags: ['Auth'], responses: { 201: { description: 'Thành công' } } } },
    '/auth/login': { post: { tags: ['Auth'], responses: { 200: { description: 'Trả về Token' } } } },
    
    // --- 2. USERS ---
    '/users': { get: { tags: ['Users'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Thành công' } } } },

    // --- 3. CLASSES ---
    '/classes': {
      get: { tags: ['Classes'], summary: 'Lấy danh sách lớp học', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Thành công' } } },
      post: {
        tags: ['Classes'],
        summary: 'Tạo lớp học mới',
        security: [{ bearerAuth: [] }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, code: { type: 'string' }, subject: { type: 'string' } } } } }
        },
        responses: { 201: { description: 'Tạo thành công' } }
      }
    },
    '/classes/{id}': {
      get: { 
        tags: ['Classes'], 
        summary: 'Xem chi tiết lớp (Hiện đầy đủ SV & GV)', 
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Thành công' } } 
      },
      put: { tags: ['Classes'], summary: 'Cập nhật lớp', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Thành công' } } },
      delete: { tags: ['Classes'], summary: 'Xóa lớp', security: [{ bearerAuth: [] }], parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 204: { description: 'Thành công' } } }
    },
    '/classes/{id}/invite': {
      get: {
        tags: ['Classes'],
        summary: 'Lấy mã QR và Link mời tham gia lớp',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Trả về mã QR Base64' } }
      }
    },
    '/classes/{id}/join': {
      post: {
        tags: ['Classes'],
        summary: 'Tham gia lớp học qua QR/Link',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Tham gia thành công' } }
      }
    },
    '/classes/{id}/leave': {
      post: {
        tags: ['Classes'],
        summary: 'Rời khỏi lớp học',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Thành công' } }
      }
    },
    '/classes/{id}/members': {
      get: {
        tags: ['Classes'],
        summary: 'Xem danh sách thành viên (Chỉ lấy GV & SV)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Thành công' } }
      }
    },

    // --- 4. GROUPS + FILES  ---
    '/groups': { get: { tags: ['Groups'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Thành công' } } } },
    '/files/upload': { post: { tags: ['Files'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Thành công' } } } },

    // --- 5. MESSAGES + ANALYTICS ---
    '/messages': { get: { tags: ['Messages'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Thành công' } } } },
    '/analytics/dashboard': { get: { tags: ['Analytics'], security: [{ bearerAuth: [] }], responses: { 200: { description: 'Thành công' } } } }
  },
};

const specs = swaggerJsdoc({ swaggerDefinition, apis: [] });
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use('*', (req, res) => {
  res.status(404).json({ status: 'error', message: `Cannot find ${req.originalUrl} on this server` });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server chạy tại: http://localhost:${PORT}. Check Swagger: http://localhost:${PORT}/api-docs`);
});

process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  server.close(() => process.exit(1));
});

module.exports = app;
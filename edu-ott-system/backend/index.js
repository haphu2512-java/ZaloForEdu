const http = require('node:http');
const path = require('node:path');

const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');

const { connectDB, disconnectDB } = require('./config/database');
const env = require('./config/env');
const swaggerDocument = require('./config/swagger');
const clientContext = require('./middlewares/clientContext');
const { errorHandler } = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');
const apiRoutes = require('./routes');
const { closeRedis, initRedis } = require('./services/redisClient');
const initSocket = require('./services/socketService');
const { closeSocket } = initSocket;
const logger = require('./utils/logger');

const createApp = () => {
  const app = express();
  const corsAllowAll = env.corsOrigins.includes('*');

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (corsAllowAll || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    }),
  );
  app.use(clientContext);
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
    });
    next();
  });
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
      message: 'Service healthy',
    });
  });

  app.get('/api-docs/openapi.json', (_req, res) => {
    res.json(swaggerDocument);
  });
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));

  app.use('/api/v1', apiRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

const app = createApp();
const server = http.createServer(app);
let socketInitialized = false;

const startServer = async () => {
  await connectDB();
  await initRedis();
  if (!socketInitialized) {
    initSocket(server);
    socketInitialized = true;
  }

  return new Promise((resolve) => {
    server.listen(env.port, () => {
      logger.info(`Server started on port ${env.port}`);
      resolve(server);
    });
  });
};

const stopServer = async () => {
  await closeSocket();
  socketInitialized = false;
  await closeRedis();
  await disconnectDB();

  if (!server.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
};

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  server,
  createApp,
  startServer,
  stopServer,
};

const { createClient } = require('redis');

const env = require('../config/env');
const logger = require('../utils/logger');

let client = null;
let connectPromise = null;
let available = false;

const keyWithPrefix = (key) => `${env.redisPrefix}:${key}`;

const initRedis = async () => {
  if (connectPromise) {
    return connectPromise;
  }

  if (!env.redisUrl) {
    logger.warn('REDIS_URL is missing. Redis-backed features will fallback to in-memory mode.');
    return null;
  }

  client = createClient({
    url: env.redisUrl,
    socket: {
      connectTimeout: env.redisConnectTimeoutMs,
      reconnectStrategy: () => false,
    },
    disableOfflineQueue: !env.redisEnableOfflineQueue,
  });

  client.on('error', (error) => {
    available = false;
    logger.error(`Redis error: ${error.message}`);
  });

  client.on('ready', () => {
    available = true;
    logger.info('Redis connected and ready');
  });

  client.on('end', () => {
    available = false;
    logger.warn('Redis connection closed');
  });

  const timeoutMs = Math.max(1000, env.redisConnectTimeoutMs + 1000);
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(`Redis connect timeout after ${timeoutMs}ms`)), timeoutMs);
  });
  const connectWithTimeout = Promise.race([client.connect(), timeoutPromise]).finally(() => {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  });

  connectPromise = connectWithTimeout
    .then(() => client)
    .catch((error) => {
      available = false;
      logger.warn(`Redis connect failed, fallback to in-memory mode: ${error.message}`);
      try {
        client.disconnect();
      } catch (_disconnectError) {
        // ignore
      }
      return null;
    });

  return connectPromise;
};

const closeRedis = async () => {
  if (!client) return;
  try {
    if (client.isOpen) {
      await client.quit();
    }
  } catch (error) {
    logger.warn(`Redis quit failed: ${error.message}`);
    try {
      client.disconnect();
    } catch (_disconnectError) {
      // ignore
    }
  } finally {
    client = null;
    connectPromise = null;
    available = false;
  }
};

const getRedis = () => client;
const isRedisAvailable = () => Boolean(client && available && client.isOpen);

module.exports = {
  initRedis,
  closeRedis,
  getRedis,
  isRedisAvailable,
  keyWithPrefix,
};

const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

const USER_INDEX_SPECS = [
  {
    name: 'email_1',
    key: { email: 1 },
    options: {
      unique: true,
      partialFilterExpression: { email: { $type: 'string' } },
    },
  },
  {
    name: 'phone_1',
    key: { phone: 1 },
    options: {
      unique: true,
      partialFilterExpression: { phone: { $type: 'string' } },
    },
  },
];

const hasKey = (index, key) => JSON.stringify(index.key || {}) === JSON.stringify(key);

const ensureUserIndexes = async () => {
  const users = mongoose.connection.db.collection('users');
  const indexes = await users.indexes();

  for (const spec of USER_INDEX_SPECS) {
    const existing = indexes.find((index) => index.name === spec.name || hasKey(index, spec.key));
    const shouldRecreate =
      existing &&
      (existing.unique !== true ||
        JSON.stringify(existing.partialFilterExpression || {}) !== JSON.stringify(spec.options.partialFilterExpression));

    if (shouldRecreate) {
      await users.dropIndex(existing.name);
      logger.info(`Dropped outdated users index: ${existing.name}`);
    }

    if (!existing || shouldRecreate) {
      await users.createIndex(spec.key, spec.options);
      logger.info(`Ensured users index: ${spec.name}`);
    }
  }
};

const connectDB = async () => {
  if (!env.mongodbUri) {
    logger.warn('MONGODB_URI is missing. Server will run without database connection.');
    return;
  }

  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const conn = await mongoose.connect(env.mongodbUri);
    await ensureUserIndexes();

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error(`Error connecting to MongoDB: ${error.message}`);
    return null;
  }
};

const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};

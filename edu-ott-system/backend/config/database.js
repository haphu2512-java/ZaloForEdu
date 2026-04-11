const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');

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

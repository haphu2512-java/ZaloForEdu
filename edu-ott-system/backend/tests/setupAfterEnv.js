const mongoose = require('mongoose');

const { connectDB, disconnectDB } = require('../config/database');
const { closeRedis, initRedis } = require('../services/redisClient');

beforeAll(async () => {
  await connectDB();
  await initRedis();
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) =>
      collection.deleteMany({}).catch(() => null),
    ),
  );
});

afterAll(async () => {
  await closeRedis();
  await disconnectDB();
});

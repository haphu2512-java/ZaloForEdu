const env = require('../config/env');
const User = require('../models/User');
const { getRedis, isRedisAvailable, keyWithPrefix } = require('./redisClient');

const userPresenceKey = (userId) => keyWithPrefix(`user:${userId}:status`);
const userConnectionsKey = (userId) => keyWithPrefix(`user:${userId}:connections`);
const typingKey = (conversationId, userId) => keyWithPrefix(`conversation:${conversationId}:typing:${userId}`);

const setOnline = async (userId) => {
  await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: null });

  if (!isRedisAvailable()) return;
  const redis = getRedis();
  const pipeline = redis.multi();
  pipeline.hSet(userPresenceKey(userId), {
    online: '1',
    lastSeen: '',
  });
  pipeline.incr(userConnectionsKey(userId));
  await pipeline.exec();
};

const setOffline = async (userId) => {
  const now = new Date();
  await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: now });

  if (!isRedisAvailable()) return now;

  const redis = getRedis();
  const remaining = await redis.decr(userConnectionsKey(userId));

  if (remaining <= 0) {
    const pipeline = redis.multi();
    pipeline.del(userConnectionsKey(userId));
    pipeline.hSet(userPresenceKey(userId), {
      online: '0',
      lastSeen: now.toISOString(),
    });
    await pipeline.exec();
  }

  return now;
};

const setTyping = async ({ conversationId, userId }) => {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  await redis.set(typingKey(conversationId, userId), '1', {
    EX: env.typingTtlSeconds,
  });
};

const clearTyping = async ({ conversationId, userId }) => {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  await redis.del(typingKey(conversationId, userId));
};

module.exports = {
  setOnline,
  setOffline,
  setTyping,
  clearTyping,
};

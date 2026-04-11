const { getRedis, isRedisAvailable, keyWithPrefix } = require('./redisClient');

const inMemoryBlacklist = new Map();

const getTtlMs = (expiresAt) => Math.max(1, expiresAt.getTime() - Date.now());

const setBlacklistedToken = async ({ jti, expiresAt }) => {
  if (!jti || !expiresAt) return;
  const ttlMs = getTtlMs(expiresAt);

  if (isRedisAvailable()) {
    const redis = getRedis();
    await redis.set(keyWithPrefix(`token:blacklist:${jti}`), '1', { PX: ttlMs });
    return;
  }

  inMemoryBlacklist.set(jti, Date.now() + ttlMs);
};

const isTokenBlacklisted = async (jti) => {
  if (!jti) return false;

  if (isRedisAvailable()) {
    const redis = getRedis();
    const value = await redis.get(keyWithPrefix(`token:blacklist:${jti}`));
    return value === '1';
  }

  const expiry = inMemoryBlacklist.get(jti);
  if (!expiry) return false;

  if (expiry <= Date.now()) {
    inMemoryBlacklist.delete(jti);
    return false;
  }

  return true;
};

module.exports = {
  setBlacklistedToken,
  isTokenBlacklisted,
};

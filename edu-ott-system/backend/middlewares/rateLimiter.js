const ApiError = require('../utils/apiError');

const getKey = (req, keyGenerator) => {
  if (typeof keyGenerator === 'function') {
    return keyGenerator(req);
  }
  return req.ip || 'unknown';
};

const createRateLimiter = ({
  windowMs = 60 * 1000,
  max = 20,
  code = 'RATE_LIMITED',
  message = 'Too many requests, please try again later.',
  keyGenerator,
}) => {
  const buckets = new Map();

  return (req, _res, next) => {
    const now = Date.now();
    const key = getKey(req, keyGenerator);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (current.count >= max) {
      return next(new ApiError(429, code, message));
    }

    current.count += 1;
    buckets.set(key, current);
    return next();
  };
};

module.exports = {
  createRateLimiter,
};

const User = require('../models/User');
const { verifyAccessToken, getDeviceTokenVersion } = require('../services/tokenService');
const { isTokenBlacklisted } = require('../services/tokenStore');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const auth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing Bearer token');
  }

  const token = authHeader.slice(7);
  let payload;

  try {
    payload = verifyAccessToken(token);
  } catch (_error) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid access token');
  }

  if (payload.type !== 'access') {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token type');
  }

  if (await isTokenBlacklisted(payload.jti)) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token is blacklisted');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.deletedAt) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
  }

  // Device-specific token version check (Zalo-style single session per device type)
  const device = payload.device || 'web';
  const expectedVersion = getDeviceTokenVersion(user, device);
  if (expectedVersion !== payload.tokenVersion) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has been terminated. Please log in again.');
  }

  req.user = user;
  req.auth = { ...payload, device };
  next();
});

module.exports = auth;

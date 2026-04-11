const User = require('../models/User');
const { verifyAccessToken } = require('../services/tokenService');
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

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token has been revoked');
  }

  req.user = user;
  req.auth = payload;
  next();
});

module.exports = auth;

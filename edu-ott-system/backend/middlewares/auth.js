const User = require('../models/User');
const { verifyAccessToken, getDeviceTokenVersion } = require('../services/tokenService');
const { isTokenBlacklisted } = require('../services/tokenStore');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');

const auth = asyncHandler(async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (req.query.token) {
    // Hỗ trợ token qua query string cho download file (browser mở URL trực tiếp)
    token = req.query.token;
  } else {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing Bearer token');
  }
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

  // Chặn đứng nếu tài khoản bị Admin khóa
  if (!user.isActive) {
    throw new ApiError(403, 'ACCOUNT_DISABLED', user.banReason || 'Your account has been disabled. Please contact support.');
  }

  const currentVersion = getDeviceTokenVersion(user, payload.device || 'web');
  if (currentVersion !== payload.tokenVersion) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'Tài khoản đã đăng nhập trên thiết bị khác.');
  }

  req.user = user;
  req.auth = payload;
  next();
});

module.exports = auth;
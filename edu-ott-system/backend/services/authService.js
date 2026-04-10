const crypto = require('node:crypto');

const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('./tokenService');
const { setBlacklistedToken } = require('./tokenStore');
const ApiError = require('../utils/apiError');

const refreshDurationMs = () => {
  const raw = env.refreshTokenExpiresIn;
  const match = /^(\d+)([smhd])$/i.exec(raw);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMap = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return value * unitMap[unit];
};

const issueTokenPair = async (user) => {
  const refreshJti = crypto.randomUUID();
  const { token: accessToken, jti: accessJti } = signAccessToken(user);
  const refreshToken = signRefreshToken(user, refreshJti);
  const expiresAt = new Date(Date.now() + refreshDurationMs());

  await RefreshToken.create({
    userId: user._id,
    jti: refreshJti,
    expiresAt,
  });

  return {
    userId: user._id,
    accessToken,
    refreshToken,
    accessJti,
    refreshJti,
    refreshExpiresAt: expiresAt,
  };
};

const rotateRefreshToken = async (token) => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (_error) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid refresh token');
  }

  if (payload.type !== 'refresh') {
    throw new ApiError(401, 'UNAUTHORIZED', 'Invalid token type');
  }

  const dbToken = await RefreshToken.findOne({
    jti: payload.jti,
    userId: payload.sub,
    revokedAt: null,
  });

  if (!dbToken || dbToken.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Refresh token expired or revoked');
  }

  const user = await User.findById(payload.sub);
  if (!user || user.deletedAt) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token version mismatch');
  }

  dbToken.revokedAt = new Date();
  await dbToken.save();

  await setBlacklistedToken({ jti: payload.jti, expiresAt: dbToken.expiresAt });

  return issueTokenPair(user);
};

const revokeRefreshToken = async (token) => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch (_error) {
    return;
  }

  const dbToken = await RefreshToken.findOne({
    jti: payload.jti,
    userId: payload.sub,
    revokedAt: null,
  });

  if (!dbToken) return;
  dbToken.revokedAt = new Date();
  await dbToken.save();
  await setBlacklistedToken({ jti: payload.jti, expiresAt: dbToken.expiresAt });
};

const revokeAllSessions = async (userId) => {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { revokedAt: new Date() });
  await User.findByIdAndUpdate(userId, { $inc: { tokenVersion: 1 } });
};

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
};

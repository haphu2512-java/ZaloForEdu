const crypto = require('node:crypto');

const env = require('../config/env');
const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { signAccessToken, signRefreshToken, verifyRefreshToken, getDeviceTokenVersion } = require('./tokenService');
const { setBlacklistedToken } = require('./tokenStore');
const ApiError = require('../utils/apiError');

const VALID_DEVICES = ['web', 'mobile'];

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

/**
 * Issue an access+refresh token pair for a user on a specific device.
 * 
 * Session Management Logic:
 * - Allows 1 active web session + 1 active mobile session simultaneously
 * - When logging in on same device type, bumps that device's version → force-logout previous session
 * - Example: User has web + mobile active → login on new web → old web logs out, mobile stays active
 */
const issueTokenPair = async (user, device = 'web') => {
  const safeDevice = VALID_DEVICES.includes(device) ? device : 'web';

  // Bump ONLY the specific device version to force-logout previous session on THAT device type
  // This allows 1 web + 1 mobile to coexist, but prevents multiple sessions on same device type
  const versionField = safeDevice === 'web' ? 'webTokenVersion' : 'mobileTokenVersion';
  await User.findByIdAndUpdate(user._id, { $inc: { [versionField]: 1 } });

  // Reload fresh user so token version is correct
  const freshUser = await User.findById(user._id);

  const refreshJti = crypto.randomUUID();
  const { token: accessToken, jti: accessJti } = signAccessToken(freshUser, safeDevice);
  const refreshToken = signRefreshToken(freshUser, refreshJti, safeDevice);
  const expiresAt = new Date(Date.now() + refreshDurationMs());

  await RefreshToken.create({
    userId: freshUser._id,
    jti: refreshJti,
    device: safeDevice,
    expiresAt,
  });

  return {
    userId: freshUser._id,
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

  // Validate device-specific token version
  const expectedVersion = getDeviceTokenVersion(user, payload.device || 'web');
  if (expectedVersion !== payload.tokenVersion) {
    throw new ApiError(401, 'SESSION_EXPIRED', 'You have been logged out from this device');
  }

  dbToken.revokedAt = new Date();
  await dbToken.save();

  await setBlacklistedToken({ jti: payload.jti, expiresAt: dbToken.expiresAt });

  // Re-issue WITHOUT bumping version (it's a normal rotation, not a new login)
  const refreshJti = crypto.randomUUID();
  const { token: accessToken, jti: accessJti } = signAccessToken(user, payload.device || 'web');
  const newRefreshToken = signRefreshToken(user, refreshJti, payload.device || 'web');
  const expiresAt = new Date(Date.now() + refreshDurationMs());

  await RefreshToken.create({
    userId: user._id,
    jti: refreshJti,
    device: payload.device || 'web',
    expiresAt,
  });

  return {
    userId: user._id,
    accessToken,
    refreshToken: newRefreshToken,
    accessJti,
    refreshJti,
    refreshExpiresAt: expiresAt,
  };
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
  await User.findByIdAndUpdate(userId, {
    $inc: { tokenVersion: 1, webTokenVersion: 1, mobileTokenVersion: 1 },
  });
};

module.exports = {
  issueTokenPair,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeAllSessions,
};

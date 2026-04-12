const crypto = require('node:crypto');

const jwt = require('jsonwebtoken');

const env = require('../config/env');

/**
 * Get the device-specific tokenVersion from the user model.
 * Falls back to global tokenVersion for backward compatibility.
 */
const getDeviceTokenVersion = (user, device) => {
  if (device === 'web') return user.webTokenVersion ?? user.tokenVersion ?? 0;
  if (device === 'mobile') return user.mobileTokenVersion ?? user.tokenVersion ?? 0;
  return user.tokenVersion ?? 0;
};

const signAccessToken = (user, device = 'web') => {
  const jti = crypto.randomUUID();
  const tokenVersion = getDeviceTokenVersion(user, device);
  const payload = {
    sub: user._id.toString(),
    type: 'access',
    tokenVersion,
    device,
    jti,
  };

  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });

  return { token, jti };
};

const signRefreshToken = (user, tokenId, device = 'web') => {
  const tokenVersion = getDeviceTokenVersion(user, device);
  const payload = {
    sub: user._id.toString(),
    type: 'refresh',
    tokenVersion,
    device,
    jti: tokenId,
  };

  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.refreshTokenExpiresIn,
  });
};

const verifyAccessToken = (token) => jwt.verify(token, env.jwtSecret);
const verifyRefreshToken = (token) => jwt.verify(token, env.jwtRefreshSecret);

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getDeviceTokenVersion,
};

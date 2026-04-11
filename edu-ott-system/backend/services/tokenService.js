const crypto = require('node:crypto');

const jwt = require('jsonwebtoken');

const env = require('../config/env');

const signAccessToken = (user) => {
  const jti = crypto.randomUUID();
  const payload = {
    sub: user._id.toString(),
    type: 'access',
    tokenVersion: user.tokenVersion,
    jti,
  };

  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.accessTokenExpiresIn,
  });

  return { token, jti };
};

const signRefreshToken = (user, tokenId) => {
  const payload = {
    sub: user._id.toString(),
    type: 'refresh',
    tokenVersion: user.tokenVersion,
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
};

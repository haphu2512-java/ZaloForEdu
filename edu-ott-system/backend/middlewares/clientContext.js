const crypto = require('node:crypto');

module.exports = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  const platform = String(req.headers['x-client-platform'] || 'unknown').toLowerCase();
  const appVersion = req.headers['x-app-version'] || null;
  const deviceId = req.headers['x-device-id'] || null;

  req.client = {
    requestId,
    platform,
    appVersion,
    deviceId,
    userAgent: req.headers['user-agent'] || '',
  };

  res.setHeader('x-request-id', requestId);
  next();
};

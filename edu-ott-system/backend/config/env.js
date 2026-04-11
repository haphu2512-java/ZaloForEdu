const dotenv = require('dotenv');
const path = require('node:path');

dotenv.config({
  path: path.join(__dirname, '..', '.env'),
  quiet: true,
});

const parseList = (raw, fallback = []) => {
  if (!raw || typeof raw !== 'string') return fallback;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

module.exports = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  corsOrigins: parseList(process.env.CORS_ORIGIN || '*', ['*']),
  mongodbUri: process.env.MONGODB_URI || '',
  jwtSecret: process.env.JWT_SECRET || 'dev_access_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  redisUrl: process.env.REDIS_URL || '',
  redisPrefix: process.env.REDIS_PREFIX || 'ott',
  uploadsDir: process.env.UPLOADS_DIR || 'uploads',
  typingTtlSeconds: Number(process.env.TYPING_TTL_SECONDS || 15),
  redisConnectTimeoutMs: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
  redisEnableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryUploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'ott-messaging',
  cloudinarySignatureTtlSeconds: Number(process.env.CLOUDINARY_SIGNATURE_TTL_SECONDS || 60),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || '',
  // When true, allow self-signed / invalid SMTP TLS certificates (development only)
  smtpAllowUnauthorized: (process.env.SMTP_ALLOW_UNAUTHORIZED === 'true') || false,
  // In development, default to Ethereal unless explicitly disabled.
  smtpUseEthereal:
    process.env.SMTP_USE_ETHEREAL === 'true'
    || (process.env.SMTP_USE_ETHEREAL !== 'false' && (process.env.NODE_ENV || 'development') !== 'production'),
};

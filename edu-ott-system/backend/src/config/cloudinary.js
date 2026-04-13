const cloudinary = require('cloudinary').v2;
const AppError = require('../utils/appError');

let isConfigured = false;

const ensureCloudinaryConfigured = () => {
  if (isConfigured) return;

  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw new AppError('Cloudinary configuration is missing in environment variables', 500);
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
  });

  isConfigured = true;
};

module.exports = {
  cloudinary,
  ensureCloudinaryConfigured,
};

const { Readable } = require('stream');
const AppError = require('./appError');
const { cloudinary, ensureCloudinaryConfigured } = require('../config/cloudinary');

const extractCloudinaryPublicId = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) {
    return null;
  }

  const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[a-zA-Z0-9]+$/);
  return match ? match[1] : null;
};

exports.uploadImageBuffer = async (buffer, options = {}) => {
  if (!buffer) {
    throw new AppError('No image data provided for upload', 400);
  }

  ensureCloudinaryConfigured();

  const {
    folder = 'edu-ott/profile-avatars',
    publicId,
    transformation = [
      { width: 512, height: 512, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' },
    ],
  } = options;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: 'image',
        transformation,
      },
      (error, result) => {
        if (error) {
          return reject(new AppError('Failed to upload image to Cloudinary', 502));
        }
        return resolve(result);
      },
    );

    Readable.from(buffer).pipe(uploadStream);
  });
};

exports.deleteImageByUrl = async (url) => {
  const publicId = extractCloudinaryPublicId(url);
  if (!publicId) return;

  ensureCloudinaryConfigured();

  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (error) {
    // Avoid blocking user profile update when cleanup fails.
    // eslint-disable-next-line no-console
    console.warn(`Cloudinary cleanup failed for ${publicId}:`, error.message);
  }
};

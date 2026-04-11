const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const Media = require('../models/Media');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const cloudinaryService = require('../services/cloudinaryService');

const uploadsFolder = path.join(__dirname, '..', 'uploads');

const uploadMedia = asyncHandler(async (req, res) => {
  const { fileName, mimeType, contentBase64 } = req.body;

  const extension = path.extname(fileName) || '.bin';
  const storedName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const filePath = path.join(uploadsFolder, storedName);
  const buffer = Buffer.from(contentBase64, 'base64');

  await fs.mkdir(uploadsFolder, { recursive: true });
  await fs.writeFile(filePath, buffer);

  const media = await Media.create({
    uploaderId: req.user._id,
    fileName,
    mimeType,
    size: buffer.byteLength,
    storage: 'local',
    url: `/uploads/${storedName}`,
  });

  return successResponse(res, media, 'Media uploaded', 201);
});

const getCloudinarySignature = asyncHandler(async (req, res) => {
  if (!cloudinaryService.isConfigured()) {
    throw new ApiError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Cloudinary is not configured');
  }

  const data = cloudinaryService.createSignedUploadParams({
    folder: req.body.folder,
    publicId: req.body.publicId,
    resourceType: req.body.resourceType,
    userId: req.user._id.toString(),
  });

  return successResponse(res, data, 'Cloudinary signature generated');
});

const registerCloudinaryMedia = asyncHandler(async (req, res) => {
  if (!cloudinaryService.isConfigured()) {
    throw new ApiError(503, 'CLOUDINARY_NOT_CONFIGURED', 'Cloudinary is not configured');
  }

  const { fileName, mimeType, size, url, publicId, resourceType } = req.body;

  const media = await Media.create({
    uploaderId: req.user._id,
    fileName,
    mimeType,
    size,
    storage: 'cloudinary',
    url,
    providerPublicId: publicId,
    providerResourceType: resourceType,
  });

  return successResponse(res, media, 'Cloudinary media registered', 201);
});

const getMediaById = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    throw new ApiError(404, 'MEDIA_NOT_FOUND', 'Media not found');
  }
  return successResponse(res, media, 'Media fetched');
});

const deleteMediaById = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    throw new ApiError(404, 'MEDIA_NOT_FOUND', 'Media not found');
  }

  if (!media.uploaderId.equals(req.user._id)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only uploader can delete media');
  }

  if (media.storage === 'cloudinary' && media.providerPublicId) {
    await cloudinaryService.destroyAsset({
      publicId: media.providerPublicId,
      resourceType: media.providerResourceType || 'image',
    });
  } else {
    const relativePath = media.url.replace(/^[\\/]/, '');
    const absolutePath = path.join(__dirname, '..', relativePath);
    await fs.unlink(absolutePath).catch(() => null);
  }

  await Media.findByIdAndDelete(media._id);

  return successResponse(res, {}, 'Media deleted');
});

module.exports = {
  uploadMedia,
  getCloudinarySignature,
  registerCloudinaryMedia,
  getMediaById,
  deleteMediaById,
};

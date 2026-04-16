const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const Media = require('../models/Media');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const cloudinaryService = require('../services/cloudinaryService');

const uploadsFolder = path.join(__dirname, '..', 'uploads');

// Convert audio to AAC/M4A using ffmpeg for iOS compatibility
const convertToM4A = async (inputPath, outputPath) => {
  const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
  try {
    await execFileAsync(ffmpegPath, [
      '-i', inputPath,
      '-vn',                    // No video
      '-acodec', 'aac',         // AAC codec - iOS compatible
      '-ar', '44100',           // Sample rate
      '-ab', '128k',            // Bitrate
      '-movflags', '+faststart', // Optimize for streaming
      '-y',                     // Overwrite output
      outputPath
    ]);
    return true;
  } catch (err) {
    console.error('ffmpeg conversion failed:', err.message);
    return false;
  }
};

// Determine if a file needs conversion for iOS compatibility
const needsConversion = (mimeType, filename) => {
  const ext = path.extname(filename).toLowerCase();
  // WebM and raw MP4 from browser MediaRecorder need conversion
  if (ext === '.webm') return true;
  if (mimeType?.includes('webm')) return true;
  // MP4 from browser MediaRecorder (often has Opus codec) needs conversion
  if (ext === '.mp4' && mimeType?.includes('mp4')) return true;
  return false;
};

const uploadMediaForm = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'NO_FILE', 'No file uploaded');

  let finalFilename = req.file.filename;
  let finalMimeType = req.file.mimetype;
  let finalSize = req.file.size;
  let finalUrl = `/uploads/${req.file.filename}`;

  // Auto-convert audio files to M4A for iOS compatibility
  const isAudio = req.file.mimetype?.startsWith('audio/') || 
                  ['.webm', '.mp4', '.wav', '.mpeg', '.mp3'].includes(
                    path.extname(req.file.originalname).toLowerCase()
                  );

  if (isAudio && needsConversion(req.file.mimetype, req.file.originalname)) {
    const inputPath = path.join(uploadsFolder, req.file.filename);
    const m4aFilename = req.file.filename.replace(/\.[^.]+$/, '') + '.m4a';
    const outputPath = path.join(uploadsFolder, m4aFilename);

    console.log(`Converting audio: ${req.file.filename} -> ${m4aFilename}`);
    const converted = await convertToM4A(inputPath, outputPath);

    if (converted) {
      // Delete original file, use converted
      await fs.unlink(inputPath).catch(() => null);
      const stat = await fs.stat(outputPath).catch(() => null);
      finalFilename = m4aFilename;
      finalMimeType = 'audio/mp4';
      finalSize = stat?.size || req.file.size;
      finalUrl = `/uploads/${m4aFilename}`;
      console.log(`Audio converted successfully: ${m4aFilename}`);
    } else {
      console.warn(`Audio conversion failed, using original: ${req.file.filename}`);
    }
  }

  const media = await Media.create({
    uploaderId: req.user._id,
    fileName: req.file.originalname,
    mimeType: finalMimeType,
    size: finalSize,
    storage: 'local',
    url: finalUrl,
  });

  return successResponse(res, media, 'Media uploaded', 201);
});

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

const downloadMediaById = asyncHandler(async (req, res) => {
  const media = await Media.findById(req.params.id);
  if (!media) {
    throw new ApiError(404, 'MEDIA_NOT_FOUND', 'Media not found');
  }

  // File local: serve với đúng tên gốc
  if (media.storage === 'local') {
    const relativePath = media.url.replace(/^[\\/]/, '');
    const absolutePath = path.join(__dirname, '..', relativePath);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(media.fileName)}"`);
    if (media.mimeType) res.setHeader('Content-Type', media.mimeType);
    return res.sendFile(absolutePath);
  }

  // Cloudinary hoặc storage khác: redirect tới URL gốc
  return res.redirect(media.url);
});

const getMyMedia = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, parseInt(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [media, total] = await Promise.all([
    Media.find({ uploaderId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Media.countDocuments({ uploaderId: req.user._id }),
  ]);

  return successResponse(res, {
    media,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  }, 'My media fetched');
});

module.exports = {
  uploadMedia,
  uploadMediaForm,
  getCloudinarySignature,
  registerCloudinaryMedia,
  getMyMedia,
  getMediaById,
  downloadMediaById,
  deleteMediaById,
};

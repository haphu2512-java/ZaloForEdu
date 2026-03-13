const path = require('path');
const multer = require('multer');
const File = require('../models/File');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('File type not allowed', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
});

// Determine file category from mime type
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (
    mimeType.includes('pdf') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('powerpoint') ||
    mimeType.includes('text')
  ) {
    return 'document';
  }
  return 'other';
};

// Export multer upload middleware
exports.uploadMiddleware = upload.single('file');

// @desc    Upload file
// @route   POST /api/v1/files/upload
// @access  Private
exports.uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file uploaded', 400));
  }

  const { roomId, roomModel } = req.body;

  const fileData = {
    originalName: req.file.originalname,
    filename: req.file.filename,
    mimeType: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/${req.file.filename}`,
    category: getFileCategory(req.file.mimetype),
    uploadedBy: req.user._id,
  };

  if (roomId) fileData.room = roomId;
  if (roomModel) fileData.roomModel = roomModel;

  const file = await File.create(fileData);

  const populatedFile = await File.findById(file._id)
    .populate('uploadedBy', 'fullName email avatar');

  res.status(201).json({
    status: 'success',
    data: { file: populatedFile },
  });
});

// @desc    Get file info / Download file
// @route   GET /api/v1/files/:id
// @access  Private
exports.getFile = asyncHandler(async (req, res, next) => {
  const file = await File.findById(req.params.id)
    .populate('uploadedBy', 'fullName email avatar');

  if (!file || file.isDeleted) {
    return next(new AppError('No file found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { file },
  });
});

// @desc    Get files list
// @route   GET /api/v1/files
// @access  Private
exports.getFiles = asyncHandler(async (req, res, next) => {
  const { roomId, roomModel, category, page = 1, limit = 20 } = req.query;

  const filter = { isDeleted: false };

  if (roomId) filter.room = roomId;
  if (roomModel) filter.roomModel = roomModel;
  if (category) filter.category = category;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await File.countDocuments(filter);

  const files = await File.find(filter)
    .populate('uploadedBy', 'fullName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: files.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { files },
  });
});

// @desc    Delete file (soft delete)
// @route   DELETE /api/v1/files/:id
// @access  Private
exports.deleteFile = asyncHandler(async (req, res, next) => {
  const file = await File.findById(req.params.id);

  if (!file || file.isDeleted) {
    return next(new AppError('No file found with that ID', 404));
  }

  // Only the uploader or admin can delete
  if (
    file.uploadedBy.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to delete this file', 403));
  }

  file.isDeleted = true;
  file.deletedAt = new Date();
  await file.save();

  res.status(200).json({
    status: 'success',
    message: 'File deleted successfully',
  });
});

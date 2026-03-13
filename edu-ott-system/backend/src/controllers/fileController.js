const path = require('path');
const multer = require('multer');
const fileService = require('../services/fileService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

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

// Export multer upload middleware
exports.uploadMiddleware = upload.single('file');

// @desc    Upload file
// @route   POST /api/v1/files/upload
// @access  Private
exports.uploadFile = asyncHandler(async (req, res, next) => {
  const file = await fileService.uploadFile(req.file, req.body, req.user._id);

  res.status(201).json({
    status: 'success',
    data: { file },
  });
});

// @desc    Get file info
// @route   GET /api/v1/files/:id
// @access  Private
exports.getFile = asyncHandler(async (req, res, next) => {
  const file = await fileService.getFileById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { file },
  });
});

// @desc    Get files list
// @route   GET /api/v1/files
// @access  Private
exports.getFiles = asyncHandler(async (req, res, next) => {
  const result = await fileService.getFiles(req.query);

  res.status(200).json({
    status: 'success',
    results: result.files.length,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    data: { files: result.files },
  });
});

// @desc    Delete file (soft delete)
// @route   DELETE /api/v1/files/:id
// @access  Private
exports.deleteFile = asyncHandler(async (req, res, next) => {
  await fileService.deleteFile(req.params.id, req.user);

  res.status(200).json({
    status: 'success',
    message: 'File deleted successfully',
  });
});

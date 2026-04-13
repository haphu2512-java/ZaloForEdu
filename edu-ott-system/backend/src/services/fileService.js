const File = require('../models/File');
const AppError = require('../utils/appError');
const { parsePagination } = require('../utils/pagination');

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

exports.uploadFile = async (file, body, userId) => {
  if (!file) {
    throw new AppError('No file uploaded', 400);
  }

  const { roomId, roomModel } = body;

  const fileData = {
    originalName: file.originalname,
    filename: file.filename,
    mimeType: file.mimetype,
    size: file.size,
    url: `/uploads/${file.filename}`,
    category: getFileCategory(file.mimetype),
    uploadedBy: userId,
  };

  if (roomId) fileData.room = roomId;
  if (roomModel) fileData.roomModel = roomModel;

  const savedFile = await File.create(fileData);

  const populatedFile = await File.findById(savedFile._id)
    .populate('uploadedBy', 'fullName email avatar');

  return populatedFile;
};

exports.getFileById = async (fileId) => {
  const file = await File.findById(fileId)
    .populate('uploadedBy', 'fullName email avatar');

  if (!file || file.isDeleted) {
    throw new AppError('No file found with that ID', 404);
  }

  return file;
};

exports.getFiles = async (query) => {
  const { roomId, roomModel, category, page = 1, limit = 20 } = query;

  const filter = { isDeleted: false };

  if (roomId) filter.room = roomId;
  if (roomModel) filter.roomModel = roomModel;
  if (category) filter.category = category;

  const { page: currentPage, limit: currentLimit, skip } = parsePagination(page, limit, {
    page: 1,
    limit: 20,
  });
  const total = await File.countDocuments(filter);

  const files = await File.find(filter)
    .populate('uploadedBy', 'fullName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit);

  return {
    files,
    total,
    page: currentPage,
    totalPages: Math.ceil(total / currentLimit),
  };
};

exports.deleteFile = async (fileId, user) => {
  const file = await File.findById(fileId);

  if (!file || file.isDeleted) {
    throw new AppError('No file found with that ID', 404);
  }

  // Only the uploader or admin can delete
  if (
    file.uploadedBy.toString() !== user._id.toString() &&
    user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to delete this file', 403);
  }

  file.isDeleted = true;
  file.deletedAt = new Date();
  await file.save();
};

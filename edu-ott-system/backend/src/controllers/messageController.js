const Message = require('../models/Message');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get messages for a room
// @route   GET /api/v1/messages
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  const { roomId, roomModel, page = 1, limit = 50, before } = req.query;

  if (!roomId || !roomModel) {
    return next(new AppError('roomId and roomModel are required', 400));
  }

  const filter = {
    room: roomId,
    roomModel,
    isDeleted: false,
  };

  // Load messages before a certain timestamp (for infinite scroll)
  if (before) {
    filter.createdAt = { $lt: new Date(before) };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Message.countDocuments(filter);

  const messages = await Message.find(filter)
    .populate('sender', 'fullName email avatar')
    .populate('replyTo', 'content sender')
    .populate('readBy.user', 'fullName avatar')
    .populate('reactions.user', 'fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: messages.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { messages },
  });
});

// @desc    Send a message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { content, type, roomId, roomModel, attachments, replyTo } = req.body;

  if (!roomId || !roomModel) {
    return next(new AppError('roomId and roomModel are required', 400));
  }

  const messageData = {
    content,
    type: type || 'text',
    sender: req.user._id,
    room: roomId,
    roomModel,
    attachments: attachments || [],
    replyTo: replyTo || null,
  };

  const message = await Message.create(messageData);

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'fullName email avatar')
    .populate('replyTo', 'content sender');

  // Emit socket event for real-time
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('message:new', populatedMessage);
  }

  res.status(201).json({
    status: 'success',
    data: { message: populatedMessage },
  });
});

// @desc    Update a message
// @route   PUT /api/v1/messages/:id
// @access  Private
exports.updateMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('No message found with that ID', 404));
  }

  // Only the sender can edit their own message
  if (message.sender.toString() !== req.user._id.toString()) {
    return next(new AppError('You can only edit your own messages', 403));
  }

  message.content = req.body.content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  const updatedMessage = await Message.findById(req.params.id)
    .populate('sender', 'fullName email avatar');

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(message.room.toString()).emit('message:updated', updatedMessage);
  }

  res.status(200).json({
    status: 'success',
    data: { message: updatedMessage },
  });
});

// @desc    Delete a message (soft delete)
// @route   DELETE /api/v1/messages/:id
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('No message found with that ID', 404));
  }

  // Only the sender or admin can delete
  if (
    message.sender.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to delete this message', 403));
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'This message has been deleted';
  await message.save();

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(message.room.toString()).emit('message:deleted', { messageId: req.params.id });
  }

  res.status(200).json({
    status: 'success',
    message: 'Message deleted successfully',
  });
});

// @desc    Mark message as read
// @route   POST /api/v1/messages/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('No message found with that ID', 404));
  }

  await message.markAsRead(req.user._id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(message.room.toString()).emit('message:read', {
      messageId: req.params.id,
      userId: req.user._id,
    });
  }

  res.status(200).json({
    status: 'success',
    message: 'Message marked as read',
  });
});

// @desc    Add reaction to message
// @route   POST /api/v1/messages/:id/reaction
// @access  Private
exports.addReaction = asyncHandler(async (req, res, next) => {
  const { emoji } = req.body;

  if (!emoji) {
    return next(new AppError('Emoji is required', 400));
  }

  const message = await Message.findById(req.params.id);

  if (!message) {
    return next(new AppError('No message found with that ID', 404));
  }

  await message.addReaction(req.user._id, emoji);

  const updatedMessage = await Message.findById(req.params.id)
    .populate('reactions.user', 'fullName avatar');

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(message.room.toString()).emit('message:reaction', {
      messageId: req.params.id,
      reactions: updatedMessage.reactions,
    });
  }

  res.status(200).json({
    status: 'success',
    data: { reactions: updatedMessage.reactions },
  });
});

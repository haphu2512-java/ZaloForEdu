const messageService = require('../services/messageService');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get messages for a room
// @route   GET /api/v1/messages
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  const result = await messageService.getMessages(req.query);

  res.status(200).json({
    status: 'success',
    results: result.messages.length,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    data: { messages: result.messages },
  });
});

// @desc    Send a message
// @route   POST /api/v1/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const message = await messageService.sendMessage(req.body, req.user._id);

  // Emit socket event for real-time
  const io = req.app.get('io');
  if (io) {
    io.to(req.body.roomId).emit('message:new', message);
  }

  res.status(201).json({
    status: 'success',
    data: { message },
  });
});

// @desc    Update a message
// @route   PUT /api/v1/messages/:id
// @access  Private
exports.updateMessage = asyncHandler(async (req, res, next) => {
  const { message, roomId } = await messageService.updateMessage(
    req.params.id,
    req.body.content,
    req.user._id
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('message:updated', message);
  }

  res.status(200).json({
    status: 'success',
    data: { message },
  });
});

// @desc    Delete a message (soft delete)
// @route   DELETE /api/v1/messages/:id
// @access  Private
exports.deleteMessage = asyncHandler(async (req, res, next) => {
  const { messageId, roomId } = await messageService.deleteMessage(req.params.id, req.user);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('message:deleted', { messageId });
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
  const { messageId, roomId } = await messageService.markAsRead(req.params.id, req.user._id);

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('message:read', {
      messageId,
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
  const { message, roomId } = await messageService.addReaction(
    req.params.id,
    req.user._id,
    req.body.emoji
  );

  // Emit socket event
  const io = req.app.get('io');
  if (io) {
    io.to(roomId).emit('message:reaction', {
      messageId: req.params.id,
      reactions: message.reactions,
      message,
    });
  }

  res.status(200).json({
    status: 'success',
    data: { message },
  });
});

const Message = require('../models/Message');
const AppError = require('../utils/appError');
const { parsePagination } = require('../utils/pagination');

exports.getMessages = async (query) => {
  const { roomId, roomModel, page = 1, limit = 50, before } = query;

  if (!roomId || !roomModel) {
    throw new AppError('roomId and roomModel are required', 400);
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

  const { page: currentPage, limit: currentLimit, skip } = parsePagination(page, limit, {
    page: 1,
    limit: 50,
  });
  const total = await Message.countDocuments(filter);

  const messages = await Message.find(filter)
    .populate('sender', 'fullName email avatar')
    .populate('replyTo', 'content sender')
    .populate('readBy.user', 'fullName avatar')
    .populate('reactions.user', 'fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit);

  return {
    messages,
    total,
    page: currentPage,
    totalPages: Math.ceil(total / currentLimit),
  };
};

exports.sendMessage = async (data, userId) => {
  const { content, type, roomId, roomModel, attachments, replyTo } = data;

  if (!roomId || !roomModel) {
    throw new AppError('roomId and roomModel are required', 400);
  }

  const messageData = {
    content,
    type: type || 'text',
    sender: userId,
    room: roomId,
    roomModel,
    attachments: attachments || [],
    replyTo: replyTo || null,
  };

  const message = await Message.create(messageData);

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'fullName email avatar')
    .populate('replyTo', 'content sender');

  return populatedMessage;
};

exports.updateMessage = async (messageId, content, userId) => {
  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('No message found with that ID', 404);
  }

  // Only the sender can edit their own message
  if (message.sender.toString() !== userId.toString()) {
    throw new AppError('You can only edit your own messages', 403);
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  const updatedMessage = await Message.findById(messageId)
    .populate('sender', 'fullName email avatar');

  return { message: updatedMessage, roomId: message.room.toString() };
};

exports.deleteMessage = async (messageId, user) => {
  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('No message found with that ID', 404);
  }

  // Only the sender or admin can delete
  if (
    message.sender.toString() !== user._id.toString() &&
    user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to delete this message', 403);
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'This message has been deleted';
  await message.save();

  return { messageId, roomId: message.room.toString() };
};

exports.markAsRead = async (messageId, userId) => {
  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('No message found with that ID', 404);
  }

  await message.markAsRead(userId);

  return { messageId, roomId: message.room.toString() };
};

exports.addReaction = async (messageId, userId, emoji) => {
  if (!emoji) {
    throw new AppError('Emoji is required', 400);
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('No message found with that ID', 404);
  }

  await message.addReaction(userId, emoji);

  const updatedMessage = await Message.findById(messageId)
    .populate('reactions.user', 'fullName avatar');

  return {
    reactions: updatedMessage.reactions,
    roomId: message.room.toString(),
  };
};

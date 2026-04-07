const Message = require('../models/Message');
const Class = require('../models/Class');
const Group = require('../models/Group');
const Conversation = require('../models/Conversation');
const AppError = require('../utils/appError');
const { parsePagination } = require('../utils/pagination');

const ensureRoomAccess = async (roomId, roomModel, user) => {
  if (user.role === 'admin') return;

  if (roomModel === 'Class') {
    const classDoc = await Class.findById(roomId).select('teacher students');
    if (!classDoc) throw new AppError('Class not found', 404);

    const isTeacher = classDoc.teacher.toString() === user._id.toString();
    const isStudent = classDoc.students.some((id) => id.toString() === user._id.toString());
    if (!isTeacher && !isStudent) throw new AppError('You are not authorized for this class', 403);
    return;
  }

  if (roomModel === 'Group') {
    const groupDoc = await Group.findById(roomId).select('members');
    if (!groupDoc) throw new AppError('Group not found', 404);

    const isMember = groupDoc.members.some((m) => m.user.toString() === user._id.toString());
    if (!isMember) throw new AppError('You are not authorized for this group', 403);
    return;
  }

  if (roomModel === 'Conversation') {
    const conversation = await Conversation.findById(roomId).select('participants');
    if (!conversation) throw new AppError('Conversation not found', 404);

    const isParticipant = conversation.participants.some(
      (id) => id.toString() === user._id.toString()
    );
    if (!isParticipant) throw new AppError('You are not authorized for this conversation', 403);
    return;
  }

  throw new AppError('Invalid roomModel', 400);
};

exports.getMessages = async (query, user) => {
  const { roomId, roomModel, page = 1, limit = 50, before } = query;

  if (!roomId || !roomModel) {
    throw new AppError('roomId and roomModel are required', 400);
  }
  await ensureRoomAccess(roomId, roomModel, user);

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

exports.sendMessage = async (data, user) => {
  const { content, type, roomId, roomModel, attachments, replyTo } = data;

  if (!roomId || !roomModel) {
    throw new AppError('roomId and roomModel are required', 400);
  }
  await ensureRoomAccess(roomId, roomModel, user);

  const messageData = {
    content,
    type: type || 'text',
    sender: user._id,
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

exports.markAsRead = async (messageId, user) => {
  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('No message found with that ID', 404);
  }

  await ensureRoomAccess(message.room, message.roomModel, user);
  await message.markAsRead(user._id);

  return { messageId, roomId: message.room.toString() };
};

exports.addReaction = async (messageId, user, emoji) => {
  if (!emoji) {
    throw new AppError('Emoji is required', 400);
  }

  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('No message found with that ID', 404);
  }

  await ensureRoomAccess(message.room, message.roomModel, user);
  await message.addReaction(user._id, emoji);

  const updatedMessage = await Message.findById(messageId)
    .populate('sender', 'fullName email avatar')
    .populate('replyTo', 'content sender')
    .populate('readBy.user', 'fullName avatar')
    .populate('reactions.user', 'fullName avatar');

  return {
    message: updatedMessage,
    roomId: message.room.toString(),
  };
};

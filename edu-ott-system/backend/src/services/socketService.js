const Message = require('../models/Message');
const User = require('../models/User');

// Store active connections: userId -> { socketId, user, connectedAt }
const activeUsers = new Map();

/**
 * Add user to active users list
 */
exports.addActiveUser = (userId, socketId, user) => {
  activeUsers.set(userId, {
    socketId,
    user,
    connectedAt: new Date(),
  });
};

/**
 * Remove user from active users list
 */
exports.removeActiveUser = (userId) => {
  activeUsers.delete(userId);
};

/**
 * Get list of all active/online users
 */
exports.getActiveUsers = () => {
  return Array.from(activeUsers.values()).map((entry) => ({
    userId: entry.user._id,
    fullName: entry.user.fullName,
    avatar: entry.user.avatar,
    connectedAt: entry.connectedAt,
  }));
};

/**
 * Check if a specific user is online
 */
exports.isUserOnline = (userId) => {
  return activeUsers.has(userId.toString());
};

/**
 * Get socket ID of a user (for direct messaging)
 */
exports.getUserSocketId = (userId) => {
  const entry = activeUsers.get(userId.toString());
  return entry ? entry.socketId : null;
};

/**
 * Save message to DB and return populated message
 * Called when client sends message via socket
 */
exports.saveMessage = async (data, userId) => {
  const { content, type, roomId, roomModel, attachments, replyTo } = data;

  const message = await Message.create({
    content,
    type: type || 'text',
    sender: userId,
    room: roomId,
    roomModel: roomModel || 'Class',
    attachments: attachments || [],
    replyTo: replyTo || null,
  });

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'fullName email avatar')
    .populate('replyTo', 'content sender');

  return populatedMessage;
};

/**
 * Mark message as read by user
 */
exports.markMessageAsRead = async (messageId, userId) => {
  const message = await Message.findById(messageId);
  if (!message) return null;

  await message.markAsRead(userId);
  return message;
};

/**
 * Update user's last login time
 */
exports.updateLastLogin = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    lastLogin: new Date(),
  });
};

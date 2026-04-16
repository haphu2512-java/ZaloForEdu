const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const ApiError = require('../utils/apiError');

const ensureConversationMember = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }

  const member = conversation.participants.some((participantId) => participantId.equals(userId));
  if (!member) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this conversation');
  }

  return conversation;
};

const createMessage = async ({ conversationId, senderId, content = '', mediaIds = [], replyTo, forwardFrom }) => {
  const conversation = await ensureConversationMember(conversationId, senderId);

  const message = await Message.create({
    conversationId,
    senderId,
    content,
    mediaIds,
    replyTo: replyTo || null,
    forwardFrom: forwardFrom || null,
    deliveredTo: [senderId],
    seenBy: [senderId],
  });

  await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

  return await Message.findById(message._id)
    .populate('mediaIds', 'fileName url size mimeType providerResourceType')
    .populate('senderId', 'username avatarUrl');
};

module.exports = {
  ensureConversationMember,
  createMessage,
};

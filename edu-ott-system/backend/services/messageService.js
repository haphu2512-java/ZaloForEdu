const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
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

/**
 * Parse @mentions từ nội dung tin nhắn.
 * Hỗ trợ: @all (tag tất cả) và @username (tag cá nhân)
 * Trả về { mentions: [userId...], mentionAll: boolean }
 */
const parseMentions = async (content, conversation) => {
  if (!content || !conversation) return { mentions: [], mentionAll: false };

  const mentionAll = /@all\b/i.test(content);

  // Tìm tất cả @username trong nội dung
  const mentionPattern = /@(\S+)/g;
  const mentionedUsernames = [];
  let match;
  while ((match = mentionPattern.exec(content)) !== null) {
    const name = match[1].toLowerCase();
    if (name !== 'all') {
      mentionedUsernames.push(name);
    }
  }

  let mentions = [];
  if (mentionedUsernames.length > 0) {
    // Tìm user có username khớp VÀ là participant của conversation
    const users = await User.find({
      username: { $in: mentionedUsernames.map((n) => new RegExp(`^${n}$`, 'i')) },
      _id: { $in: conversation.participants },
    }).select('_id');
    mentions = users.map((u) => u._id);
  }

  return { mentions, mentionAll };
};

const createMessage = async ({ conversationId, senderId, content = '', mediaIds = [], replyTo, forwardFrom }) => {
  const conversation = await ensureConversationMember(conversationId, senderId);

  // Parse @mentions
  const { mentions, mentionAll } = await parseMentions(content, conversation);

  const message = await Message.create({
    conversationId,
    senderId,
    content,
    mediaIds,
    replyTo: replyTo || null,
    forwardFrom: forwardFrom || null,
    deliveredTo: [senderId],
    seenBy: [senderId],
    mentions,
    mentionAll,
  });

  await Conversation.findByIdAndUpdate(conversationId, { lastMessageAt: new Date() });

  return await Message.findById(message._id)
    .populate('mediaIds', 'fileName url size mimeType providerResourceType')
    .populate('senderId', 'username avatarUrl');
};

module.exports = {
  ensureConversationMember,
  createMessage,
  parseMentions,
};

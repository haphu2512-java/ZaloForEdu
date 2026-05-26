const mongoose = require('mongoose');

const Message = require('../models/Message');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const ConversationPreference = require('../models/ConversationPreference');
const GroupMember = require('../models/GroupMember');
const { createMessage, ensureConversationMember } = require('../services/messageService');
const { decodeCursor, encodeCursor } = require('../utils/cursor');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const socketService = require('../services/socketService');

const toStr = (id) => id?.toString();

const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, content, mediaIds, replyTo, forwardFrom, channelId, type, isPinnedAnnouncement } = req.body;
  if (!content && (!mediaIds || mediaIds.length === 0)) {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Message content or media is required');
  }

  const Conversation = require('../models/Conversation');
  const User = require('../models/User');
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(req.user._id);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(req.user._id));

  let communityMember = null;
  if (conversation.type === 'community') {
    communityMember = await GroupMember.findOne({ groupId: conversationId, userId: req.user._id });
    if (!communityMember || communityMember.status !== 'active') {
      throw new ApiError(403, 'FORBIDDEN', 'You are not an active member of this community');
    }
    if (communityMember.mutedUntil && new Date(communityMember.mutedUntil) > new Date()) {
      throw new ApiError(403, 'FORBIDDEN', 'You are muted in this community');
    }
    if (type === 'announcement' && !['owner', 'admin', 'mod'].includes(communityMember.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin/mod can post announcements');
    }
  }

  if (!isOwner && !isAdmin) {
    if (conversation.settings?.canMembersSendMessages === false) {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin/owner can send messages in this group');
    }
  }

  // Chat 1-1: kiểm tra block + messagePrivacy
  if (conversation.type === 'direct') {
    const otherParticipantId = conversation.participants.find(p => toStr(p) !== toStr(req.user._id));
    if (otherParticipantId) {
      const currentUser = await User.findById(req.user._id);
      const otherUser = await User.findById(otherParticipantId).select('blockedUsers messagePrivacy friends');
      if (currentUser?.blockedUsers?.some(id => toStr(id) === toStr(otherParticipantId))) {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn đã chặn người này');
      }
      if (otherUser?.blockedUsers?.some(id => toStr(id) === toStr(req.user._id))) {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn đã bị người này chặn');
      }
      if (otherUser?.messagePrivacy === 'friends') {
        const isFriend = (otherUser.friends || []).some(f => toStr(f) === toStr(req.user._id));
        if (!isFriend) {
          throw new ApiError(403, 'PRIVACY_RESTRICTED', 'Người dùng này chỉ nhận tin nhắn từ bạn bè');
        }
      }
    }
  }

  const message = await createMessage({
    conversationId,
    senderId: req.user._id,
    content,
    mediaIds,
    replyTo,
    forwardFrom,
    channelId: channelId || null,
    type: type || 'text',
    isPinnedAnnouncement: Boolean(isPinnedAnnouncement),
  });

  // Set firstSenderId nếu chưa có (tin nhắn đầu tiên)
  if (!conversation.firstSenderId) {
    conversation.firstSenderId = req.user._id;
    await conversation.save();
  }

  // Populate media để frontend hiển thị ngay
  await message.populate('mediaIds', 'fileName url size mimeType providerResourceType duration');
  await message.populate('senderId', 'username avatarUrl');

  if (message.type === 'announcement') {
    socketService.emitToCommunityChannel(
      conversationId,
      message.channelId || null,
      'announcement',
      message,
    );
  } else {
    socketService.emitToCommunityChannel(
      conversationId,
      message.channelId || null,
      'new_message',
      message,
    );
  }
  await socketService.emitConversationUpdated(conversationId, {
    conversationId,
    latestMessage: message,
  });

  return successResponse(res, message, 'Message sent', 201);
});

const listMessagesByConversation = asyncHandler(async (req, res) => {
  const conversationId = req.params.id;
  const limit = Number(req.query.limit);
  const { cursor } = req.query;
  const channelId = req.query.channelId || null;

  const conversation = await ensureConversationMember(conversationId, req.user._id, true);

  const query = {
    conversationId,
    channelId,
    deletedBy: { $ne: req.user._id } // Do not fetch messages deleted by this user
  };

  if (conversation._leftAt) {
    query.createdAt = { $lte: conversation._leftAt };
  }

  if (conversation.type === 'group' && String(conversation.createdBy) !== String(req.user._id)) {
    const pref = await mongoose.model('ConversationPreference').findOne({ conversationId, userId: req.user._id });
    if (pref) {
      const joinedAt = pref.createdAt;
      const allowReadHistory = conversation.settings?.allowNewMembersReadHistory;
      let minDate;
      if (allowReadHistory === false) {
        minDate = joinedAt; // Only from the exact moment they joined
      } else {
        // allowNewMembersReadHistory is true (default) -> allow reading messages from "today" (00:00 of joined day)
        minDate = new Date(joinedAt);
        minDate.setHours(0, 0, 0, 0);
      }
      
      if (query.createdAt) {
        query.createdAt.$gte = minDate;
      } else {
        query.createdAt = { $gte: minDate };
      }
    }
  }

  if (cursor) {
    const parsedCursor = decodeCursor(cursor);
    if (!parsedCursor) {
      throw new ApiError(400, 'INVALID_CURSOR', 'Cursor is invalid');
    }

    query.$or = [
      { createdAt: { $lt: parsedCursor.createdAt } },
      {
        createdAt: parsedCursor.createdAt,
        _id: { $lt: new mongoose.Types.ObjectId(parsedCursor.id) },
      },
    ];
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('senderId', 'username avatarUrl')
    .populate('mediaIds', 'fileName url size mimeType providerResourceType duration')
    .populate('replyTo')
    .populate('forwardFrom')
    .populate({
      path: 'pollId',
      populate: [
        { path: 'createdBy', select: 'username avatarUrl' },
        { path: 'options.votes', select: 'username avatarUrl' }
      ]
    })
    .populate('reminderId', 'title remindAt participants declinedBy createdBy');

  let nextCursor = null;
  let finalItems = messages;

  if (messages.length > limit) {
    const nextItem = messages[limit - 1];
    nextCursor = encodeCursor({
      createdAt: nextItem.createdAt,
      id: nextItem._id.toString(),
    });
    finalItems = messages.slice(0, limit);
  }

  return successResponse(
    res,
    {
      items: finalItems,
      nextCursor,
      limit,
    },
    'Messages fetched',
  );
});

const markMessageRead = asyncHandler(async (req, res) => {
  const message = await Message.findById(req.params.id);
  if (!message) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }

  await ensureConversationMember(message.conversationId, req.user._id);
  await Message.findByIdAndUpdate(message._id, {
    $addToSet: { seenBy: req.user._id, deliveredTo: req.user._id },
  });

  socketService.emitToConversation(message.conversationId.toString(), 'message_seen', {
    messageId: message._id,
    userId: req.user._id,
  });

  return successResponse(res, {}, 'Message marked as read');
});

const deleteMessageForMe = asyncHandler(async (req, res) => {
  // Xóa tin nhắn (thuộc về phía mình - "Delete for me")
  const message = await Message.findById(req.params.id);
  if (!message) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }

  await ensureConversationMember(message.conversationId, req.user._id);

  // Save user _id to deletedBy array
  if (!message.deletedBy.includes(req.user._id)) {
    message.deletedBy.push(req.user._id);
    await message.save();
  }

  return successResponse(res, {}, 'Message deleted for you');
});

const recallMessage = asyncHandler(async (req, res) => {
  // Thu hồi tin nhắn (với mọi người - "Recall/Unsend")
  const message = await Message.findById(req.params.id);
  if (!message) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }

  const isSender = message.senderId.equals(req.user._id);

  // Nếu không phải người gửi → kiểm tra quyền Admin/Owner trong nhóm
  if (!isSender) {
    const Conversation = require('../models/Conversation');
    const conversation = await Conversation.findById(message.conversationId);
    if (!conversation || conversation.type !== 'group') {
      throw new ApiError(403, 'FORBIDDEN', 'Only sender can recall this message');
    }
    const ownerId = (conversation.ownerId || conversation.createdBy)?.toString();
    const isOwner = ownerId === toStr(req.user._id);
    const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(req.user._id));
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, 'FORBIDDEN', 'Only sender or group admin can recall this message');
    }
  }

  message.isRecalled = true;
  await message.save();

  socketService.emitToConversation(message.conversationId.toString(), 'message_recalled', {
    messageId: message._id,
    conversationId: message.conversationId,
  });

  await socketService.emitMessageRecalled(message.conversationId.toString(), {
    messageId: message._id,
    conversationId: message.conversationId,
  });

  return successResponse(res, message, 'Message recalled successfully');
});

const reactToMessage = asyncHandler(async (req, res) => {
  const { emoji } = req.body;
  const message = await Message.findById(req.params.id);
  if (!message) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message not found');
  }

  await ensureConversationMember(message.conversationId, req.user._id);

  // Check if reaction exists
  const existingReactionIndex = message.reactions.findIndex(
    (r) => r.userId.toString() === req.user._id.toString()
  );

  if (existingReactionIndex >= 0) {
    if (emoji) {
      // Update emoji
      message.reactions[existingReactionIndex].emoji = emoji;
    } else {
      // Remove reaction if no emoji is provided
      message.reactions.splice(existingReactionIndex, 1);
    }
  } else if (emoji) {
    // Add new reaction
    message.reactions.push({ userId: req.user._id, emoji });
  }

  await message.save();

  socketService.emitToConversation(message.conversationId.toString(), 'message_reacted', {
    messageId: message._id,
    reactions: message.reactions,
  });

  return successResponse(res, message.reactions, 'Reaction updated');
});

const searchMessagesInConversation = asyncHandler(async (req, res) => {
  const { id: conversationId } = req.params;
  const { q, limit: limitRaw, cursor } = req.query;
  if (!q || !q.trim()) throw new ApiError(400, 'INVALID_QUERY', 'Search query is required');

  const limit = Math.min(Number(limitRaw) || 20, 100);

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'NOT_FOUND', 'Conversation not found');

  let isMember = conversation.participants.some((p) => String(p) === String(req.user._id));
  let leftAt = null;
  if (!isMember && conversation.pastParticipants) {
    const pastMember = conversation.pastParticipants.find(p => String(p.userId) === String(req.user._id));
    if (pastMember) {
      isMember = true;
      leftAt = pastMember.leftAt;
    }
  }

  if (!isMember) throw new ApiError(403, 'FORBIDDEN', 'Not a member of this conversation');

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const queryRegex = new RegExp(escaped, 'i');
  const filter = {
    conversationId,
    content: queryRegex,
    isRecalled: { $ne: true },
    deletedBy: { $ne: req.user._id },
  };

  if (leftAt) {
    filter.createdAt = { $lte: leftAt };
  }

  if (conversation.type === 'group' && String(conversation.createdBy) !== String(req.user._id)) {
    const pref = await mongoose.model('ConversationPreference').findOne({ conversationId, userId: req.user._id });
    if (pref) {
      const joinedAt = pref.createdAt;
      const allowReadHistory = conversation.settings?.allowNewMembersReadHistory;
      let minDate;
      if (allowReadHistory === false) {
        minDate = joinedAt;
      } else {
        minDate = new Date(joinedAt);
        minDate.setHours(0, 0, 0, 0);
      }
      
      if (filter.createdAt) {
        filter.createdAt.$gte = minDate;
      } else {
        filter.createdAt = { $gte: minDate };
      }
    }
  }

  if (cursor) {
    const parsed = decodeCursor(cursor);
    if (!parsed) throw new ApiError(400, 'INVALID_CURSOR', 'Bad cursor');
    filter.$or = [
      { createdAt: { $lt: parsed.createdAt } },
      { createdAt: parsed.createdAt, _id: { $lt: parsed.id } },
    ];
  }

  const items = await Message.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('senderId', 'username avatarUrl fullName');

  let nextCursor = null;
  let finalItems = items;
  if (items.length > limit) {
    const next = items[limit - 1];
    nextCursor = encodeCursor({ createdAt: next.createdAt, id: next._id.toString() });
    finalItems = items.slice(0, limit);
  }

  return successResponse(res, { items: finalItems, nextCursor, limit }, 'Messages found');
});

module.exports = {
  sendMessage,
  listMessagesByConversation,
  markMessageRead,
  deleteMessage: deleteMessageForMe,
  recallMessage,
  reactToMessage,
  searchMessagesInConversation,
};

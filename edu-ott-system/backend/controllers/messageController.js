const mongoose = require('mongoose');

const Message = require('../models/Message');
const User = require('../models/User');
const ConversationPreference = require('../models/ConversationPreference');
const { createMessage, ensureConversationMember } = require('../services/messageService');
const { decodeCursor, encodeCursor } = require('../utils/cursor');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const socketService = require('../services/socketService');

const toStr = (id) => id?.toString();

const sendMessage = asyncHandler(async (req, res) => {
  const { conversationId, content, mediaIds, replyTo, forwardFrom } = req.body;
  if (!content && (!mediaIds || mediaIds.length === 0)) {
    throw new ApiError(400, 'INVALID_PAYLOAD', 'Message content or media is required');
  }

  const Conversation = require('../models/Conversation');
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(req.user._id);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(req.user._id));
  if (!isOwner && !isAdmin) {
    if (conversation.settings?.canMembersSendMessages === false) {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin/owner can send messages in this group');
    }
  }

  // Nếu là chat nhóm, kiểm tra quyền gửi tin nhắn
  if (conversation.type === 'group') {
    const isAdmin = (conversation.adminIds || []).some(id => toStr(id) === toStr(req.user._id));
    const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(req.user._id);
    if (conversation.settings?.canMembersSendMessages === false && !isAdmin && !isOwner) {
      throw new ApiError(403, 'FORBIDDEN', 'Chỉ Admin mới có quyền gửi tin nhắn trong nhóm này');
    }
  }

  // Nếu là chat 1-1, kiểm tra xem có ai bị block không
  if (conversation.type === 'direct') {
    const otherParticipantId = conversation.participants.find(p => toStr(p) !== toStr(req.user._id));
    if (otherParticipantId) {
      const currentUser = await User.findById(req.user._id);
      const otherUser = await User.findById(otherParticipantId);
      if (currentUser && currentUser.blockedUsers && currentUser.blockedUsers.some(id => toStr(id) === toStr(otherParticipantId))) {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn đã chặn người này');
      }
      if (otherUser && otherUser.blockedUsers && otherUser.blockedUsers.some(id => toStr(id) === toStr(req.user._id))) {
        throw new ApiError(403, 'FORBIDDEN', 'Bạn đã bị người này chặn');
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
  });

  // Set firstSenderId nếu chưa có (tin nhắn đầu tiên)
  if (!conversation.firstSenderId) {
    conversation.firstSenderId = req.user._id;
    await conversation.save();
  }

  // Populate media để frontend hiển thị ngay
  await message.populate('mediaIds', 'fileName url size mimeType providerResourceType');
  await message.populate('senderId', 'username avatarUrl');

  // Un-hide conversation for all participants who had hidden it (e.g. via "delete conversation")
  await ConversationPreference.updateMany(
    { conversationId, isHidden: true },
    { $set: { isHidden: false } }
  );

  socketService.emitToConversation(conversationId, 'new_message', message);
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

  await ensureConversationMember(conversationId, req.user._id);

  const query = {
    conversationId,
    deletedBy: { $ne: req.user._id } // Do not fetch messages deleted by this user
  };

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
    .populate('mediaIds', 'fileName url size mimeType providerResourceType')
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

module.exports = {
  sendMessage,
  listMessagesByConversation,
  markMessageRead,
  deleteMessage: deleteMessageForMe,
  recallMessage,
  reactToMessage,
};
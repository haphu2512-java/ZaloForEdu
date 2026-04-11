const Conversation = require('../models/Conversation');
const ConversationPreference = require('../models/ConversationPreference');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { encodeCursor, decodeCursor } = require('../utils/cursor');

const toStr = (id) => id?.toString();
const getOwnerId = (conversation) => conversation.ownerId || conversation.createdBy;

const ensureGroupConversation = (conversation) => {
  if (!conversation) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
  if (conversation.type !== 'group') {
    throw new ApiError(400, 'INVALID_CONVERSATION_TYPE', 'This action is only for group conversations');
  }
};

const ensureGroupMember = (conversation, userId) => {
  const isMember = conversation.participants.some((participantId) => toStr(participantId) === toStr(userId));
  if (!isMember) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this group');
  }
};

const ensureOwner = (conversation, userId) => {
  if (toStr(getOwnerId(conversation)) !== toStr(userId)) {
    throw new ApiError(403, 'FORBIDDEN', 'Only group owner can perform this action');
  }
};

const ensureAdminOrOwner = (conversation, userId) => {
  const isOwner = toStr(getOwnerId(conversation)) === toStr(userId);
  const isAdmin = (conversation.adminIds || []).some((adminId) => toStr(adminId) === toStr(userId));
  if (!isOwner && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Only owner/admin can perform this action');
  }
};

const listConversations = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { cursor } = req.query;

  const hiddenOrDeletedPrefs = await ConversationPreference.find({
    userId: req.user._id,
    $or: [{ isHidden: true }, { isDeleted: true }],
  }).select('conversationId');
  const excludedConversationIds = hiddenOrDeletedPrefs.map((item) => item.conversationId);

  const baseFilter = {
    participants: req.user._id,
    ...(excludedConversationIds.length > 0 ? { _id: { $nin: excludedConversationIds } } : {}),
  };

  // Apply cursor filter
  const query = { ...baseFilter };
  if (cursor) {
    const parsedCursor = decodeCursor(cursor);
    if (!parsedCursor) {
      throw new ApiError(400, 'INVALID_CURSOR', 'Cursor is invalid');
    }
    query.$or = [
      { lastMessageAt: { $lt: parsedCursor.createdAt } },
      {
        lastMessageAt: parsedCursor.createdAt,
        _id: { $lt: parsedCursor.id },
      },
    ];
  }

  const conversations = await Conversation.find(query)
    .populate('participants', 'username email avatarUrl isOnline lastSeen')
    .populate('ownerId', 'username avatarUrl')
    .populate('adminIds', 'username avatarUrl')
    .sort({ lastMessageAt: -1, _id: -1 })
    .limit(limit + 1);

  let nextCursor = null;
  let finalItems = conversations;

  if (conversations.length > limit) {
    const nextItem = conversations[limit - 1];
    nextCursor = encodeCursor({
      createdAt: nextItem.lastMessageAt,
      id: nextItem._id.toString(),
    });
    finalItems = conversations.slice(0, limit);
  }

  if (finalItems.length === 0) {
    return successResponse(
      res,
      {
        items: [],
        nextCursor: null,
        limit,
      },
      'Conversations fetched',
    );
  }

  const conversationIds = finalItems.map((conversation) => conversation._id);
  
  const latestMessagePromises = conversationIds.map((cid) => 
    Message.findOne({ conversationId: cid, deletedBy: { $ne: req.user._id } })
      .sort({ createdAt: -1, _id: -1 })
      .populate('senderId', 'username avatarUrl')
  );
  
  const latestMessagesArr = await Promise.all(latestMessagePromises);

  const items = finalItems.map((conversation, index) => {
    const latest = latestMessagesArr[index];
    return {
      ...conversation.toObject(),
      latestMessage: latest ? latest.toObject() : null,
    };
  });

  const preferences = await ConversationPreference.find({
    userId: req.user._id,
    conversationId: { $in: conversationIds },
  });
  const prefMap = new Map(preferences.map((pref) => [toStr(pref.conversationId), pref.toObject()]));
  const itemsWithPrefs = items.map((conversation) => ({
    ...conversation,
    preference: prefMap.get(toStr(conversation._id)) || null,
  }));

  return successResponse(
    res,
    {
      items: itemsWithPrefs,
      nextCursor,
      limit,
    },
    'Conversations fetched',
  );
});

const createConversation = asyncHandler(async (req, res) => {
  const { type, name, participantIds } = req.body;
  const uniqueParticipants = [...new Set([...participantIds, req.user._id.toString()])];

  if (type === 'direct' && uniqueParticipants.length !== 2) {
    throw new ApiError(400, 'INVALID_PARTICIPANTS', 'Direct conversation must contain exactly 2 participants');
  }

  if (type === 'direct') {
    const existing = await Conversation.findOne({
      type: 'direct',
      participants: { $all: uniqueParticipants, $size: 2 },
    });

    if (existing) {
      return successResponse(res, existing, 'Conversation already exists');
    }
  }

  const conversation = await Conversation.create({
    type,
    name: type === 'group' ? name || 'Group chat' : null,
    participants: uniqueParticipants,
    createdBy: req.user._id,
    ownerId: req.user._id,
    adminIds: type === 'group' ? [req.user._id] : [],
    lastMessageAt: new Date(),
  });

  return successResponse(res, conversation, 'Conversation created', 201);
});

const updateGroupName = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureAdminOrOwner(conversation, req.user._id);

  conversation.name = name.trim();
  await conversation.save();
  return successResponse(res, conversation, 'Group name updated');
});

const addGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberIds } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureAdminOrOwner(conversation, req.user._id);
  ensureGroupMember(conversation, req.user._id);

  const currentIds = new Set(conversation.participants.map((participantId) => toStr(participantId)));
  const validMemberIds = [...new Set(memberIds)].filter((memberId) => !currentIds.has(memberId));
  if (validMemberIds.length === 0) {
    throw new ApiError(400, 'NO_NEW_MEMBERS', 'All users are already in the group');
  }

  conversation.participants.push(...validMemberIds);
  await conversation.save();
  return successResponse(res, conversation, 'Members added to group');
});

const removeGroupMember = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureAdminOrOwner(conversation, req.user._id);

  const isTargetMember = conversation.participants.some((participantId) => toStr(participantId) === memberId);
  if (!isTargetMember) {
    throw new ApiError(404, 'MEMBER_NOT_FOUND', 'User is not in this group');
  }

  if (toStr(getOwnerId(conversation)) === memberId) {
    throw new ApiError(400, 'INVALID_ACTION', 'Cannot remove group owner');
  }

  conversation.participants = conversation.participants.filter((participantId) => toStr(participantId) !== memberId);
  conversation.adminIds = (conversation.adminIds || []).filter((adminId) => toStr(adminId) !== memberId);
  await conversation.save();
  return successResponse(res, conversation, 'Member removed from group');
});

const promoteGroupAdmin = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureOwner(conversation, req.user._id);

  const isTargetMember = conversation.participants.some((participantId) => toStr(participantId) === memberId);
  if (!isTargetMember) {
    throw new ApiError(404, 'MEMBER_NOT_FOUND', 'User is not in this group');
  }
  if (toStr(getOwnerId(conversation)) === memberId) {
    throw new ApiError(400, 'INVALID_ACTION', 'Owner is already highest role');
  }

  const adminSet = new Set((conversation.adminIds || []).map((adminId) => toStr(adminId)));
  adminSet.add(memberId);
  conversation.adminIds = [...adminSet];
  await conversation.save();
  return successResponse(res, conversation, 'Member promoted to admin');
});

const demoteGroupAdmin = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureOwner(conversation, req.user._id);

  if (toStr(conversation.ownerId) === memberId) {
    throw new ApiError(400, 'INVALID_ACTION', 'Cannot demote group owner');
  }

  conversation.adminIds = (conversation.adminIds || []).filter((adminId) => toStr(adminId) !== memberId);
  await conversation.save();
  return successResponse(res, conversation, 'Admin role removed');
});

const transferGroupOwner = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newOwnerId } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureOwner(conversation, req.user._id);

  const isTargetMember = conversation.participants.some((participantId) => toStr(participantId) === newOwnerId);
  if (!isTargetMember) {
    throw new ApiError(404, 'MEMBER_NOT_FOUND', 'New owner must be in this group');
  }

  const previousOwnerId = toStr(getOwnerId(conversation));
  conversation.ownerId = newOwnerId;

  const adminSet = new Set((conversation.adminIds || []).map((adminId) => toStr(adminId)));
  adminSet.add(previousOwnerId);
  adminSet.delete(newOwnerId);
  conversation.adminIds = [...adminSet];

  await conversation.save();
  return successResponse(res, conversation, 'Group ownership transferred');
});

const leaveGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureGroupMember(conversation, req.user._id);

  const userId = toStr(req.user._id);
  if (toStr(getOwnerId(conversation)) === userId) {
    throw new ApiError(400, 'OWNER_CANNOT_LEAVE', 'Owner must transfer ownership before leaving group');
  }

  conversation.participants = conversation.participants.filter((participantId) => toStr(participantId) !== userId);
  conversation.adminIds = (conversation.adminIds || []).filter((adminId) => toStr(adminId) !== userId);
  await conversation.save();
  return successResponse(res, conversation, 'Left group successfully');
});

const updateGroupAvatar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { avatarUrl } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureAdminOrOwner(conversation, req.user._id);
  conversation.avatarUrl = avatarUrl;
  await conversation.save();
  return successResponse(res, conversation, 'Group avatar updated');
});

const updateGroupNickname = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;
  const { nickname } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureGroupMember(conversation, req.user._id);

  const isTargetMember = conversation.participants.some((participantId) => toStr(participantId) === memberId);
  if (!isTargetMember) {
    throw new ApiError(404, 'MEMBER_NOT_FOUND', 'User is not in this group');
  }

  conversation.nicknames.set(memberId, nickname.trim());
  await conversation.save();
  return successResponse(res, conversation, 'Group nickname updated');
});

const pinGroupMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { messageId } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureAdminOrOwner(conversation, req.user._id);
  const message = await Message.findById(messageId);
  if (!message || toStr(message.conversationId) !== toStr(id)) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message does not belong to this group');
  }
  conversation.pinnedMessageId = messageId;
  await conversation.save();
  return successResponse(res, conversation, 'Group message pinned');
});

const unpinGroupMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureAdminOrOwner(conversation, req.user._id);
  conversation.pinnedMessageId = null;
  await conversation.save();
  return successResponse(res, conversation, 'Group pinned message cleared');
});

const updateConversationPreference = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await Conversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
  ensureGroupMember(conversation, req.user._id);
  const pref = await ConversationPreference.findOneAndUpdate(
    { userId: req.user._id, conversationId: id },
    { $set: req.body, $setOnInsert: { userId: req.user._id, conversationId: id } },
    { new: true, upsert: true },
  );
  return successResponse(res, pref, 'Conversation preference updated');
});

module.exports = {
  listConversations,
  createConversation,
  updateGroupName,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  transferGroupOwner,
  leaveGroup,
  updateGroupAvatar,
  updateGroupNickname,
  pinGroupMessage,
  unpinGroupMessage,
  updateConversationPreference,
};

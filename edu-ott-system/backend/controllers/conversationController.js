const Conversation = require('../models/Conversation');
const ConversationPreference = require('../models/ConversationPreference');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { encodeCursor, decodeCursor } = require('../utils/cursor');
const socketService = require('../services/socketService');

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

const ensureCanUpdateGroupInfo = (conversation, userId) => {
  const isOwner = toStr(getOwnerId(conversation)) === toStr(userId);
  const isAdmin = (conversation.adminIds || []).some((adminId) => toStr(adminId) === toStr(userId));
  if (!isOwner && !isAdmin) {
    if (conversation.settings?.canMembersUpdateInfo !== false) {
      ensureGroupMember(conversation, userId);
    } else {
      throw new ApiError(403, 'FORBIDDEN', 'Only owner/admin can update group info');
    }
  }
};

const emitGroupSystemMessage = async ({ conversationId, senderId, content }) => {
  const sysMsg = await Message.create({
    conversationId,
    senderId,
    content,
    type: 'system',
  });
  await sysMsg.populate('senderId', 'username avatarUrl fullName');
  socketService.emitToConversation(conversationId.toString(), 'new_message', sysMsg);
  await socketService.emitConversationUpdated(conversationId.toString(), {
    conversationId,
    latestMessage: sysMsg,
  });
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
    $or: [
      { participants: req.user._id },
      { 'pastParticipants.userId': req.user._id }
    ],
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
    .populate('participants', 'username email avatarUrl isOnline lastSeen messagePrivacy')
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
      ...conversation.toObject({ flattenMaps: true }),
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

  // ── Ghim hội thoại: sort pinned lên đầu, giữ nguyên thứ tự thời gian bên trong ──
  itemsWithPrefs.sort((a, b) => {
    const aPinned = a.preference?.isPinned ? 1 : 0;
    const bPinned = b.preference?.isPinned ? 1 : 0;
    if (bPinned !== aPinned) return bPinned - aPinned;
    // Cùng trạng thái ghim → giữ thứ tự thời gian gốc (lastMessageAt desc)
    const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
    const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
    return timeB - timeA;
  });

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
  const myId = req.user._id.toString();
  const uniqueParticipants = [...new Set([...participantIds, myId])];

  // Self-conversation: direct với chính mình (My Documents)
  const isSelfConv = type === 'direct' && uniqueParticipants.length === 1;

  if (type === 'direct' && !isSelfConv && uniqueParticipants.length !== 2) {
    throw new ApiError(400, 'INVALID_PARTICIPANTS', 'Direct conversation must contain exactly 2 participants');
  }

  if (type === 'direct') {
    // Check existing
    const existing = await Conversation.findOne(
      isSelfConv
        ? { type: 'direct', participants: { $all: [myId], $size: 1 } }
        : { type: 'direct', participants: { $all: uniqueParticipants, $size: 2 } }
    );
    if (existing) {
      await existing.populate('participants', 'username email avatarUrl isOnline lastSeen messagePrivacy');
      return successResponse(res, existing, 'Conversation already exists');
    }
  }

  const conversation = await Conversation.create({
    type,
    name: type === 'group' ? name || 'Group chat' : null,
    participants: isSelfConv ? [myId] : uniqueParticipants,
    createdBy: req.user._id,
    ownerId: req.user._id,
    adminIds: type === 'group' ? [req.user._id] : [],
    lastMessageAt: new Date(),
  });

  const participantsToCreatePref = isSelfConv ? [myId] : uniqueParticipants;
  const prefOps = participantsToCreatePref.map(uid => ({
    updateOne: {
      filter: { conversationId: conversation._id, userId: uid },
      update: { $set: { conversationId: conversation._id, userId: uid } },
      upsert: true,
      setDefaultsOnInsert: true
    }
  }));
  if (prefOps.length > 0) {
    await ConversationPreference.bulkWrite(prefOps);
  }

  await conversation.populate('participants', 'username email avatarUrl isOnline lastSeen messagePrivacy');
  return successResponse(res, conversation, 'Conversation created', 201);
});

const updateGroupName = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureCanUpdateGroupInfo(conversation, req.user._id);

  conversation.name = name.trim();
  await conversation.save();
  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã đổi tên nhóm thành "${conversation.name}"`,
  });

  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    action: 'group_name_updated',
    name: conversation.name
  });
  return successResponse(res, conversation, 'Group name updated');
});

const addGroupMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberIds } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  const isPrivileged = toStr(getOwnerId(conversation)) === toStr(req.user._id) || (conversation.adminIds || []).some(aid => toStr(aid) === toStr(req.user._id));
  ensureGroupMember(conversation, req.user._id);

  // If approval is required and user is not admin/owner, create join requests instead of adding directly
  if (conversation.settings?.isApprovalRequired && !isPrivileged) {
    const JoinRequest = require('../models/JoinRequest');
    const currentIds = new Set(conversation.participants.map((p) => toStr(p)));
    const validMemberIds = [...new Set(memberIds)].filter((m) => !currentIds.has(m));
    if (validMemberIds.length === 0) {
      throw new ApiError(400, 'NO_NEW_MEMBERS', 'All users are already in the group');
    }

    const createdRequests = [];
    for (const targetUserId of validMemberIds) {
      const existing = await JoinRequest.findOne({ conversationId: id, userId: targetUserId, status: 'pending' });
      if (!existing) {
        const reqDoc = await JoinRequest.create({
          conversationId: id,
          userId: targetUserId,
          status: 'pending',
          invitedBy: req.user._id,
        });
        createdRequests.push(reqDoc);
      }
    }

    if (createdRequests.length > 0) {
      const adminIds = [
        toStr(getOwnerId(conversation)),
        ...(conversation.adminIds || []).map(toStr),
      ].filter(Boolean);
      
      for (const adminId of adminIds) {
        for (const jr of createdRequests) {
          socketService.emitToUser(adminId, 'join_request_received', {
            conversationId: id,
            conversationName: conversation.name,
            joinRequest: jr,
          });
        }
      }
      return successResponse(res, { requiresApproval: true }, 'Join requests created for admin approval', 202);
    } else {
      throw new ApiError(400, 'REQUESTS_ALREADY_PENDING', 'Join requests already pending for these users');
    }
  }

  // Otherwise, add directly
  const currentIds = new Set(conversation.participants.map((participantId) => toStr(participantId)));
  const validMemberIds = [...new Set(memberIds)].filter((memberId) => !currentIds.has(memberId));
  if (validMemberIds.length === 0) {
    throw new ApiError(400, 'NO_NEW_MEMBERS', 'All users are already in the group');
  }

  // Remove from pastParticipants if they were previously kicked
  conversation.pastParticipants = (conversation.pastParticipants || []).filter(
    (p) => !validMemberIds.includes(toStr(p.userId))
  );

  conversation.participants.push(...validMemberIds);
  await conversation.save();

  // Create or update preferences for new members to track joinedAt date
  const prefOps = validMemberIds.map(uid => ({
    updateOne: {
      filter: { conversationId: conversation._id, userId: uid },
      update: { 
        $set: { conversationId: conversation._id, userId: uid, createdAt: new Date() } 
      },
      upsert: true
    }
  }));
  if (prefOps.length > 0) {
    await ConversationPreference.bulkWrite(prefOps);
  }

  const addedUsers = await User.find({ _id: { $in: validMemberIds } }).select('fullName username');
  const addedNames = addedUsers
    .map((u) => u.fullName || u.username)
    .filter(Boolean);
  const senderName = req.user.fullName || req.user.username;
  const addedText = addedNames.length > 0
    ? addedNames.join(', ')
    : `${validMemberIds.length} thành viên`;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã thêm ${addedText} vào nhóm`,
  });

  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    action: 'members_added',
  });

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

  const ownerId = toStr(getOwnerId(conversation));
  if (ownerId === memberId) {
    throw new ApiError(400, 'INVALID_ACTION', 'Cannot remove group owner');
  }

  // Phân quyền nâng cao:
  const isOwner = toStr(req.user._id) === ownerId;
  const isTargetAdmin = (conversation.adminIds || []).some((adminId) => toStr(adminId) === memberId);

  // Nếu không phải là Trưởng nhóm, mà muốn xóa một Phó nhóm -> Từ chối
  if (!isOwner && isTargetAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Only group owner can remove other admins');
  }

  if (!conversation.pastParticipants) conversation.pastParticipants = [];
  conversation.pastParticipants.push({ userId: memberId, leftAt: new Date() });
  conversation.participants = conversation.participants.filter((participantId) => toStr(participantId) !== memberId);
  conversation.adminIds = (conversation.adminIds || []).filter((adminId) => toStr(adminId) !== memberId);
  await conversation.save();

  const removedUser = await User.findById(memberId).select('fullName username');
  const removedName = removedUser?.fullName || removedUser?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã mời ${removedName} ra khỏi nhóm`,
  });

  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    action: 'member_removed',
    memberId,
  });

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

  const targetUser = await User.findById(memberId).select('fullName username');
  const targetName = targetUser?.fullName || targetUser?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  
  // Emit system message
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã cấp quyền phó nhóm cho ${targetName}`,
  });

  // Emit group_updated event for real-time sync
  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    ownerId: conversation.ownerId,
    adminIds: conversation.adminIds,
    action: 'member_promoted',
  });

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

  const targetUser = await User.findById(memberId).select('fullName username');
  const targetName = targetUser?.fullName || targetUser?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  
  // Emit system message
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã gỡ quyền phó nhóm của ${targetName}`,
  });

  // Emit group_updated event for real-time sync
  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    ownerId: conversation.ownerId,
    adminIds: conversation.adminIds,
    action: 'member_demoted',
  });

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

  const newOwner = await User.findById(newOwnerId).select('fullName username');
  const newOwnerName = newOwner?.fullName || newOwner?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  
  // Emit system message
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã chuyển quyền trưởng nhóm cho ${newOwnerName}`,
  });

  // Emit group_updated event for real-time sync
  console.log('[transferGroupOwner] Emitting group_updated event:', {
    conversationId: conversation._id.toString(),
    ownerId: newOwnerId,
    adminIds: conversation.adminIds,
  });
  
  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    ownerId: newOwnerId,
    adminIds: conversation.adminIds,
    action: 'owner_transferred',
  });

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

  if (!conversation.pastParticipants) conversation.pastParticipants = [];
  conversation.pastParticipants.push({ userId, leftAt: new Date() });
  conversation.participants = conversation.participants.filter((participantId) => toStr(participantId) !== userId);
  conversation.adminIds = (conversation.adminIds || []).filter((adminId) => toStr(adminId) !== userId);
  await conversation.save();

  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã rời nhóm`,
  });

  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    action: 'member_left',
    userId,
  });

  return successResponse(res, conversation, 'Left group successfully');
});

const disbandGroup = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureOwner(conversation, req.user._id);

  // Soft delete messages, or permanent? Let's just delete them.
  await Message.deleteMany({ conversationId: id });
  // Delete preferences
  await ConversationPreference.deleteMany({ conversationId: id });
  // Delete conversation
  await conversation.deleteOne();

  await socketService.emitGroupUpdated(id, {
    conversationId: id,
    action: 'group_disbanded',
  });

  return successResponse(res, null, 'Group disbanded successfully');
});

const updateGroupAvatar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { avatarUrl } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureCanUpdateGroupInfo(conversation, req.user._id);
  conversation.avatarUrl = avatarUrl;
  await conversation.save();

  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã cập nhật ảnh đại diện nhóm`,
  });

  await socketService.emitGroupUpdated(conversation._id.toString(), {
    conversationId: conversation._id.toString(),
    action: 'group_avatar_updated',
    avatarUrl: conversation.avatarUrl
  });

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

  if (nickname.trim() === '') {
    conversation.nicknames.delete(memberId);
  } else {
    conversation.nicknames.set(memberId, nickname.trim());
  }
  await conversation.save();

  const targetUser = await User.findById(memberId).select('fullName username');
  const targetName = targetUser?.fullName || targetUser?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã đổi biệt danh của ${targetName}`,
  });

  return successResponse(res, conversation, 'Group nickname updated');
});

const pinGroupMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { messageId } = req.body;
  const conversation = await Conversation.findById(id);
  ensureGroupConversation(conversation);
  ensureGroupMember(conversation, req.user._id);
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
  ensureGroupMember(conversation, req.user._id);
  conversation.pinnedMessageId = null;
  await conversation.save();
  return successResponse(res, conversation, 'Group pinned message cleared');
});

const listArchivedConversations = asyncHandler(async (req, res) => {
  // Find conversations marked as hidden by the current user
  const hiddenPrefs = await ConversationPreference.find({
    userId: req.user._id,
    isHidden: true,
    isDeleted: { $ne: true },
  }).select('conversationId');

  const hiddenIds = hiddenPrefs.map((p) => p.conversationId);

  if (hiddenIds.length === 0) {
    return successResponse(res, { items: [], nextCursor: null, limit: 50 }, 'Archived conversations fetched');
  }

  const conversations = await Conversation.find({
    _id: { $in: hiddenIds },
    participants: req.user._id,
  })
    .populate('participants', 'username email avatarUrl isOnline lastSeen messagePrivacy')
    .sort({ lastMessageAt: -1, _id: -1 });

  const conversationIds = conversations.map((c) => c._id);
  const latestMessagePromises = conversationIds.map((cid) =>
    Message.findOne({ conversationId: cid, deletedBy: { $ne: req.user._id } })
      .sort({ createdAt: -1 })
      .populate('senderId', 'username avatarUrl'),
  );
  const latestMessagesArr = await Promise.all(latestMessagePromises);

  const items = conversations.map((conv, idx) => ({
    ...conv.toObject({ flattenMaps: true }),
    latestMessage: latestMessagesArr[idx] ? latestMessagesArr[idx].toObject() : null,
  }));

  return successResponse(res, { items, nextCursor: null, limit: 50 }, 'Archived conversations fetched');
});

const updateConversationPreference = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const conversation = await Conversation.findById(id);
  if (!conversation) {
    throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  }
  ensureGroupMember(conversation, req.user._id);

  // Tự động set/xoá pinnedAt khi toggle isPinned
  const updateData = { ...req.body };
  if (typeof updateData.isPinned === 'boolean') {
    updateData.pinnedAt = updateData.isPinned ? new Date() : null;
  }

  const pref = await ConversationPreference.findOneAndUpdate(
    { userId: req.user._id, conversationId: id },
    { $set: updateData, $setOnInsert: { userId: req.user._id, conversationId: id } },
    { returnDocument: 'after', upsert: true },
  );
  return successResponse(res, pref, 'Conversation preference updated');
});

module.exports = {
  listConversations,
  listArchivedConversations,
  createConversation,
  updateGroupName,
  addGroupMembers,
  removeGroupMember,
  promoteGroupAdmin,
  demoteGroupAdmin,
  transferGroupOwner,
  leaveGroup,
  disbandGroup,
  updateGroupAvatar,
  updateGroupNickname,
  pinGroupMessage,
  unpinGroupMessage,
  updateConversationPreference,
};


const crypto = require('crypto');
const Conversation = require('../models/Conversation');
const JoinRequest = require('../models/JoinRequest');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const socketService = require('../services/socketService');

const toStr = (id) => id?.toString();

const ensureGroupMember = (conversation, userId) => {
  const isMember = conversation.participants.some((p) => toStr(p) === toStr(userId));
  if (!isMember) throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this group');
};

const ensureAdminOrOwner = (conversation, userId) => {
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(userId);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(userId));
  if (!isOwner && !isAdmin) throw new ApiError(403, 'FORBIDDEN', 'Only owner/admin can perform this action');
};

const ensureCanPin = (conversation, userId) => {
  if (conversation.type !== 'group') return;
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(userId);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(userId));
  if (!isOwner && !isAdmin) {
    if (conversation.settings?.canMembersPin === false) {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin/owner can pin messages');
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

// ==================== FEATURE 2: PINNED ITEMS (Bảng tin) ====================

/**
 * POST /api/v1/conversations/:id/pins
 * Ghim tin nhắn (thêm vào danh sách ghim)
 */
const pinMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { messageId } = req.body;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureGroupMember(conversation, req.user._id);
  ensureCanPin(conversation, req.user._id);

  const message = await Message.findById(messageId);
  if (!message || toStr(message.conversationId) !== toStr(id)) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message does not belong to this conversation');
  }

  const alreadyPinned = (conversation.pinnedItems || []).some(item =>
    (item.messageId._id || item.messageId).toString() === messageId.toString()
  );
  if (alreadyPinned) throw new ApiError(400, 'ALREADY_PINNED', 'Message is already pinned');

  // Giới hạn tối đa 20 ghim
  if ((conversation.pinnedItems || []).length >= 20) {
    throw new ApiError(400, 'PIN_LIMIT_REACHED', 'Maximum 20 pinned items allowed');
  }

  conversation.pinnedItems.push({
    messageId,
    pinnedBy: req.user._id,
    pinnedAt: new Date(),
  });
  await conversation.save();
  await conversation.populate([
    {
      path: 'pinnedItems.messageId',
      populate: { path: 'senderId', select: 'username avatarUrl' }
    },
    { path: 'pinnedItems.pinnedBy', select: 'username avatarUrl' }
  ]);

  await socketService.emitPinnedItemsUpdated(id, {
    conversationId: id,
    pinnedItems: conversation.pinnedItems
  });

  // Thông báo hệ thống
  const senderName = req.user.fullName || req.user.username;
  const shortContent = message.content
    ? (message.content.length > 50 ? message.content.substring(0, 50) + '...' : message.content)
    : '[Hình ảnh/File]';

  const pinSysMsg = await Message.create({
    conversationId: id,
    senderId: req.user._id,
    content: `${senderName} đã ghim tin nhắn: "${shortContent}"`,
    type: 'system'
  });
  await pinSysMsg.populate('senderId', 'username avatarUrl fullName');
  socketService.emitToConversation(id, 'new_message', pinSysMsg);
  await socketService.emitConversationUpdated(id, {
    conversationId: id,
    latestMessage: pinSysMsg
  });

  return successResponse(res, conversation.pinnedItems, 'Message pinned');
});

/**
 * DELETE /api/v1/conversations/:id/pins/:messageId
 * Bỏ ghim tin nhắn
 */
const unpinMessage = asyncHandler(async (req, res) => {
  const { id, messageId } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureGroupMember(conversation, req.user._id);
  ensureCanPin(conversation, req.user._id);

  const initialCount = (conversation.pinnedItems || []).length;
  // Cho phép xóa bằng cả messageId hoặc pinId (ID của entry trong mảng pinnedItems)
  conversation.pinnedItems = (conversation.pinnedItems || []).filter(
    (item) => {
      const itemMsgId = (item.messageId._id || item.messageId).toString();
      const itemPinId = item._id.toString();
      return itemMsgId !== messageId.toString() && itemPinId !== messageId.toString();
    }
  );

  if (conversation.pinnedItems.length === initialCount) {
    throw new ApiError(404, 'NOT_PINNED', 'This message is not pinned');
  }

  await conversation.save();
  await conversation.populate([
    {
      path: 'pinnedItems.messageId',
      populate: { path: 'senderId', select: 'username avatarUrl' }
    },
    { path: 'pinnedItems.pinnedBy', select: 'username avatarUrl' }
  ]);

  await socketService.emitPinnedItemsUpdated(id, {
    conversationId: id,
    pinnedItems: conversation.pinnedItems
  });

  // Thông báo hệ thống khi bỏ ghim
  const senderName = req.user.fullName || req.user.username;
  const unpinSysMsg = await Message.create({
    conversationId: id,
    senderId: req.user._id,
    content: `${senderName} đã bỏ ghim tin nhắn.`,
    type: 'system'
  });
  await unpinSysMsg.populate('senderId', 'username avatarUrl fullName');
  socketService.emitToConversation(id, 'new_message', unpinSysMsg);
  await socketService.emitConversationUpdated(id, {
    conversationId: id,
    latestMessage: unpinSysMsg
  });

  return successResponse(res, conversation.pinnedItems, 'Message unpinned');
});

/**
 * GET /api/v1/conversations/:id/pins
 * Lấy danh sách tin nhắn ghim (Bảng tin)
 */
const getPinnedMessages = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const conversation = await Conversation.findById(id)
    .populate({
      path: 'pinnedItems.messageId',
      populate: { path: 'senderId', select: 'username avatarUrl' }
    })
    .populate('pinnedItems.pinnedBy', 'username avatarUrl');

  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureGroupMember(conversation, req.user._id);

  return successResponse(res, conversation.pinnedItems || [], 'Pinned messages fetched');
});

// ==================== FEATURE 4: JOIN APPROVAL ====================

/**
 * PUT /api/v1/conversations/:id/settings
 * Cập nhật cài đặt nhóm (isApprovalRequired)
 */
const updateGroupSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isApprovalRequired, canMembersUpdateInfo, canMembersPin, canMembersCreateReminders, canMembersCreatePolls, canMembersSendMessages } = req.body;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  if (conversation.type !== 'group') throw new ApiError(400, 'INVALID_CONVERSATION_TYPE', 'Only for group conversations');
  ensureAdminOrOwner(conversation, req.user._id);

  const updates = {};
  if (typeof isApprovalRequired === 'boolean') updates.isApprovalRequired = isApprovalRequired;
  if (typeof canMembersUpdateInfo === 'boolean') updates.canMembersUpdateInfo = canMembersUpdateInfo;
  if (typeof canMembersPin === 'boolean') updates.canMembersPin = canMembersPin;
  if (typeof canMembersCreateReminders === 'boolean') updates.canMembersCreateReminders = canMembersCreateReminders;
  if (typeof canMembersCreatePolls === 'boolean') updates.canMembersCreatePolls = canMembersCreatePolls;
  if (typeof canMembersSendMessages === 'boolean') updates.canMembersSendMessages = canMembersSendMessages;
  if (typeof req.body.markAdminMessages === 'boolean') updates.markAdminMessages = req.body.markAdminMessages;

  conversation.settings = { ...conversation.settings, ...updates };
  await conversation.save();

  socketService.emitToConversation(id, 'conversation_settings_updated', conversation.settings);
  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã cập nhật cài đặt nhóm`,
  });

  return successResponse(res, conversation.settings, 'Group settings updated');
});

/**
 * POST /api/v1/conversations/:id/join-requests
 * Gửi yêu cầu gia nhập nhóm (khi isApprovalRequired = true)
 */
const requestToJoin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  if (conversation.type !== 'group') throw new ApiError(400, 'INVALID_CONVERSATION_TYPE', 'Only for group conversations');

  // Kiểm tra đã là thành viên chưa
  const alreadyMember = conversation.participants.some((p) => toStr(p) === toStr(req.user._id));
  if (alreadyMember) throw new ApiError(400, 'ALREADY_MEMBER', 'You are already in this group');

  // Tạo hoặc cập nhật request
  const existing = await JoinRequest.findOne({ conversationId: id, userId: req.user._id });
  if (existing && existing.status === 'pending') {
    throw new ApiError(400, 'REQUEST_ALREADY_SENT', 'You already have a pending join request');
  }

  const joinRequest = await JoinRequest.findOneAndUpdate(
    { conversationId: id, userId: req.user._id },
    { status: 'pending', reason: reason?.trim() || '', processedBy: null, processedAt: null },
    { returnDocument: 'after', upsert: true },
  );

  await joinRequest.populate('userId', 'username avatarUrl email');

  // Notify admins/owner about new join request
  const adminIds = [
    toStr(conversation.ownerId || conversation.createdBy),
    ...(conversation.adminIds || []).map(toStr),
  ].filter(Boolean);
  adminIds.forEach((adminId) => {
    socketService.emitToUser(adminId, 'join_request_received', {
      conversationId: id,
      conversationName: conversation.name,
      joinRequest,
    });
  });

  return successResponse(res, joinRequest, 'Join request sent', 201);
});

/**
 * GET /api/v1/conversations/:id/join-requests
 * Admin lấy danh sách yêu cầu gia nhập
 */
const listJoinRequests = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status = 'pending' } = req.query;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureAdminOrOwner(conversation, req.user._id);

  const requests = await JoinRequest.find({ conversationId: id, status })
    .populate('userId', 'username avatarUrl email phone')
    .sort({ createdAt: -1 });

  return successResponse(res, { items: requests }, 'Join requests fetched');
});

/**
 * PUT /api/v1/conversations/:id/join-requests/:requestId
 * Admin duyệt hoặc từ chối yêu cầu gia nhập
 */
const processJoinRequest = asyncHandler(async (req, res) => {
  const { id, requestId } = req.params;
  const { action } = req.body; // 'approve' | 'reject'

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureAdminOrOwner(conversation, req.user._id);

  const joinRequest = await JoinRequest.findById(requestId);
  if (!joinRequest || toStr(joinRequest.conversationId) !== id) {
    throw new ApiError(404, 'REQUEST_NOT_FOUND', 'Join request not found');
  }
  if (joinRequest.status !== 'pending') {
    throw new ApiError(400, 'REQUEST_ALREADY_PROCESSED', 'This request has already been processed');
  }

  if (action === 'approve') {
    joinRequest.status = 'approved';
    // Thêm user vào nhóm
    if (!conversation.participants.some((p) => toStr(p) === toStr(joinRequest.userId))) {
      conversation.participants.push(joinRequest.userId);
      await conversation.save();
    }
  } else if (action === 'reject') {
    joinRequest.status = 'rejected';
  } else {
    throw new ApiError(400, 'INVALID_ACTION', "Action must be 'approve' or 'reject'");
  }

  joinRequest.processedBy = req.user._id;
  joinRequest.processedAt = new Date();
  await joinRequest.save();
  await joinRequest.populate('userId', 'username avatarUrl');

  // Notify the requester of the decision
  socketService.emitToUser(toStr(joinRequest.userId._id || joinRequest.userId), 'join_request_processed', {
    conversationId: id,
    conversationName: conversation.name,
    action,
  });

  const senderName = req.user.fullName || req.user.username;
  const requesterName = joinRequest.userId?.fullName || joinRequest.userId?.username || 'một thành viên';
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: action === 'approve'
      ? `${senderName} đã duyệt ${requesterName} vào nhóm`
      : `${senderName} đã từ chối yêu cầu tham gia của ${requesterName}`,
  });

  return successResponse(res, joinRequest, `Join request ${action}d`);
});

// ==================== FEATURE 5: INVITE LINKS ====================

/**
 * GET /api/v1/conversations/:id/invite-link
 * Lấy (hoặc tạo) invite link cho nhóm
 */
const getInviteLink = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  if (conversation.type !== 'group') throw new ApiError(400, 'INVALID_CONVERSATION_TYPE', 'Only for group conversations');
  ensureAdminOrOwner(conversation, req.user._id);

  // Tạo invite code nếu chưa có
  if (!conversation.inviteCode) {
    conversation.inviteCode = crypto.randomBytes(8).toString('hex'); // 16 ký tự hex
    await conversation.save();
  }

  return successResponse(
    res,
    {
      inviteCode: conversation.inviteCode,
      inviteLink: `zaloedu://join/${conversation.inviteCode}`,
    },
    'Invite link fetched',
  );
});

/**
 * POST /api/v1/conversations/invite/:code/reset
 * Reset (tạo lại) invite code (invalidate link cũ)
 */
const resetInviteLink = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const conversation = await Conversation.findOne({ inviteCode: code });
  if (!conversation) throw new ApiError(404, 'INVALID_INVITE_CODE', 'Invite code not found');
  ensureAdminOrOwner(conversation, req.user._id);

  conversation.inviteCode = crypto.randomBytes(8).toString('hex');
  await conversation.save();

  return successResponse(
    res,
    {
      inviteCode: conversation.inviteCode,
      inviteLink: `zaloedu://join/${conversation.inviteCode}`,
    },
    'Invite link reset',
  );
});

/**
 * GET /api/v1/conversations/preview/:code
 * Xem preview nhóm trước khi tham gia (không cần là thành viên)
 */
const previewGroupByInviteCode = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const conversation = await Conversation.findOne({ inviteCode: code })
    .select('name avatarUrl type participants settings')
    .populate('participants', 'username avatarUrl');

  if (!conversation) throw new ApiError(404, 'INVALID_INVITE_CODE', 'Invite link is invalid or expired');

  return successResponse(
    res,
    {
      _id: conversation._id,
      name: conversation.name,
      avatarUrl: conversation.avatarUrl,
      memberCount: conversation.participants.length,
      isApprovalRequired: conversation.settings?.isApprovalRequired || false,
    },
    'Group preview fetched',
  );
});

/**
 * POST /api/v1/conversations/join/:code
 * Tham gia nhóm qua invite link
 */
const joinByInviteLink = asyncHandler(async (req, res) => {
  const { code } = req.params;

  const conversation = await Conversation.findOne({ inviteCode: code });
  if (!conversation) throw new ApiError(404, 'INVALID_INVITE_CODE', 'Invite link is invalid or expired');

  // Kiểm tra đã là thành viên chưa
  const alreadyMember = conversation.participants.some((p) => toStr(p) === toStr(req.user._id));
  if (alreadyMember) {
    return successResponse(res, conversation, 'Already a member of this group');
  }

  // Nếu nhóm yêu cầu duyệt → tạo join request
  if (conversation.settings?.isApprovalRequired) {
    const existing = await JoinRequest.findOne({ conversationId: conversation._id, userId: req.user._id, status: 'pending' });
    if (existing) throw new ApiError(400, 'REQUEST_ALREADY_SENT', 'Your join request is pending approval');

    const joinRequest = await JoinRequest.findOneAndUpdate(
      { conversationId: conversation._id, userId: req.user._id },
      { status: 'pending', invitedBy: null, processedBy: null, processedAt: null },
      { returnDocument: 'after', upsert: true },
    );

    return successResponse(res, { requiresApproval: true, joinRequest }, 'Join request sent, waiting for approval', 202);
  }

  // Tham gia trực tiếp
  conversation.participants.push(req.user._id);
  await conversation.save();

  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã tham gia nhóm qua link mời`,
  });

  return successResponse(res, conversation, 'Joined group successfully');
});

// ==================== FEATURE 6: BLOCK MEMBERS (Chặn khỏi nhóm) ====================

const blockMember = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { memberId } = req.body;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureAdminOrOwner(conversation, req.user._id);

  const targetStr = toStr(memberId);
  const ownerStr = toStr(conversation.ownerId || conversation.createdBy);
  if (targetStr === ownerStr) throw new ApiError(403, 'FORBIDDEN', 'Cannot block the group owner');

  conversation.participants = conversation.participants.filter(p => toStr(p) !== targetStr);
  if (!conversation.blockedMembers) conversation.blockedMembers = [];
  if (!conversation.blockedMembers.some(b => toStr(b) === targetStr)) {
    conversation.blockedMembers.push(memberId);
  }
  await conversation.save();

  socketService.emitToUser(targetStr, 'removed_from_group', { conversationId: id, reason: 'blocked' });
  socketService.emitToConversation(id, 'member_blocked', { conversationId: id, memberId: targetStr });
  const targetUser = await User.findById(memberId).select('fullName username');
  const targetName = targetUser?.fullName || targetUser?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã chặn và mời ${targetName} khỏi nhóm`,
  });

  return successResponse(res, {}, 'Member blocked');
});

const unblockMember = asyncHandler(async (req, res) => {
  const { id, memberId } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureAdminOrOwner(conversation, req.user._id);

  conversation.blockedMembers = (conversation.blockedMembers || []).filter(b => toStr(b) !== toStr(memberId));
  await conversation.save();
  const targetUser = await User.findById(memberId).select('fullName username');
  const targetName = targetUser?.fullName || targetUser?.username || 'một thành viên';
  const senderName = req.user.fullName || req.user.username;
  await emitGroupSystemMessage({
    conversationId: conversation._id,
    senderId: req.user._id,
    content: `${senderName} đã bỏ chặn ${targetName}`,
  });

  return successResponse(res, {}, 'Member unblocked');
});

const listBlockedMembers = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const conversation = await Conversation.findById(id).populate('blockedMembers', 'username avatarUrl');
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureAdminOrOwner(conversation, req.user._id);

  return successResponse(res, conversation.blockedMembers || [], 'Blocked members fetched');
});

module.exports = {
  // Feature 2: Pinned items
  pinMessage,
  unpinMessage,
  getPinnedMessages,
  // Feature 4: Join approval
  updateGroupSettings,
  requestToJoin,
  listJoinRequests,
  processJoinRequest,
  // Feature 5: Invite links
  getInviteLink,
  resetInviteLink,
  previewGroupByInviteCode,
  joinByInviteLink,
  // Feature 6: Block members
  blockMember,
  unblockMember,
  listBlockedMembers,
};

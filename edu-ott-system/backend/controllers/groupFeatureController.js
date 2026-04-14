const crypto = require('crypto');
const Conversation = require('../models/Conversation');
const JoinRequest = require('../models/JoinRequest');
const Message = require('../models/Message');
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

  const message = await Message.findById(messageId);
  if (!message || toStr(message.conversationId) !== toStr(id)) {
    throw new ApiError(404, 'MESSAGE_NOT_FOUND', 'Message does not belong to this conversation');
  }

  // Kiểm tra đã ghim chưa
  const alreadyPinned = (conversation.pinnedItems || []).some(
    (item) => toStr(item.messageId) === toStr(messageId),
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

  socketService.emitToConversation(id, 'pinned_items_updated', conversation.pinnedItems);

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

  const prevLen = (conversation.pinnedItems || []).length;
  conversation.pinnedItems = (conversation.pinnedItems || []).filter(
    (item) => toStr(item.messageId) !== messageId,
  );

  if (conversation.pinnedItems.length === prevLen) {
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
  
  socketService.emitToConversation(id, 'pinned_items_updated', conversation.pinnedItems);

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
  const { isApprovalRequired } = req.body;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  if (conversation.type !== 'group') throw new ApiError(400, 'INVALID_CONVERSATION_TYPE', 'Only for group conversations');
  ensureAdminOrOwner(conversation, req.user._id);

  if (typeof isApprovalRequired === 'boolean') {
    conversation.settings = { ...conversation.settings, isApprovalRequired };
  }
  await conversation.save();

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
    { new: true, upsert: true },
  );

  await joinRequest.populate('userId', 'username avatarUrl email');

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
      { new: true, upsert: true },
    );

    return successResponse(res, { requiresApproval: true, joinRequest }, 'Join request sent, waiting for approval', 202);
  }

  // Tham gia trực tiếp
  conversation.participants.push(req.user._id);
  await conversation.save();

  return successResponse(res, conversation, 'Joined group successfully');
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
};

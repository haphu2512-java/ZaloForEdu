const Poll = require('../models/Poll');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const socketService = require('../services/socketService');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

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

const ensureCanCreatePolls = (conversation, userId) => {
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(userId);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(userId));
  if (!isOwner && !isAdmin) {
    if (conversation.settings?.canMembersCreatePolls === false) {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin/owner can create polls in this group');
    }
  }
};

/**
 * POST /api/v1/polls
 * Tạo bình chọn mới trong nhóm
 */
const createPoll = asyncHandler(async (req, res) => {
  const { conversationId, question, options, isMultipleChoice, isAnonymous, allowAddOptions, expiredAt } = req.body;

  // Validate conversation
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  if (conversation.type !== 'group') throw new ApiError(400, 'INVALID_CONVERSATION_TYPE', 'Polls are only for group conversations');
  ensureGroupMember(conversation, req.user._id);
  ensureCanCreatePolls(conversation, req.user._id);

  if (!options || options.length < 2) {
    throw new ApiError(400, 'INVALID_OPTIONS', 'Poll must have at least 2 options');
  }

  const poll = await Poll.create({
    conversationId,
    createdBy: req.user._id,
    question: question.trim(),
    options: options.map((text) => ({ text: text.trim(), votes: [] })),
    isMultipleChoice: isMultipleChoice || false,
    isAnonymous: isAnonymous || false,
    allowAddOptions: allowAddOptions || false,
    expiredAt: expiredAt || null,
  });

  await poll.populate('createdBy', 'username avatarUrl');

  // Tạo Message kiểu poll
  const message = await Message.create({
    conversationId,
    senderId: req.user._id,
    type: 'poll',
    pollId: poll._id,
    content: `Bình chọn: ${question}`, // Fallback
  });
  await message.populate('senderId', 'username avatarUrl');
  await message.populate({ path: 'pollId', populate: { path: 'createdBy', select: 'username avatarUrl' } });

  // Phát socket sự kiện
  socketService.emitToConversation(conversationId, 'new_message', message);
  socketService.emitConversationUpdated(conversationId, {
    conversationId,
    latestMessage: message,
  });

  // Thông báo hệ thống tạo bình chọn
  const senderName = req.user.fullName || req.user.username;
  const sysMsg2 = await Message.create({
    conversationId,
    senderId: req.user._id,
    content: `${senderName} đã tạo cuộc bình chọn: "${question}"`,
    type: 'system',
    pollId: poll._id
  });
  await sysMsg2.populate('senderId', 'username avatarUrl fullName');
  socketService.emitToConversation(conversationId, 'new_message', sysMsg2);
  socketService.emitConversationUpdated(conversationId, {
    conversationId,
    latestMessage: sysMsg2
  });

  return successResponse(res, poll, 'Poll created', 201);
});

/**
 * GET /api/v1/polls/:id
 * Lấy thông tin poll và kết quả
 */
const getPoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const poll = await Poll.findById(id)
    .populate('createdBy', 'username avatarUrl')
    .populate('options.votes', 'username avatarUrl');

  if (!poll) throw new ApiError(404, 'POLL_NOT_FOUND', 'Poll not found');

  const conversation = await Conversation.findById(poll.conversationId);
  ensureGroupMember(conversation, req.user._id);

  // Nếu poll ẩn danh, ẩn danh sách voters — giữ count bằng cách trả về array null
  const safePoll = poll.toObject();
  if (poll.isAnonymous) {
    safePoll.options = safePoll.options.map((opt) => ({
      ...opt,
      votes: opt.votes.map(() => null), // giữ count nhưng ẩn thông tin người chọn
    }));
  }

  return successResponse(res, safePoll, 'Poll fetched');
});

/**
 * POST /api/v1/polls/:id/vote
 * Gửi lựa chọn vote
 */
const votePoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { optionIndexes } = req.body; // Array of option indexes

  const poll = await Poll.findById(id);
  if (!poll) throw new ApiError(404, 'POLL_NOT_FOUND', 'Poll not found');
  if (poll.isClosed) throw new ApiError(400, 'POLL_CLOSED', 'This poll has been closed');
  if (poll.expiredAt && poll.expiredAt < new Date()) throw new ApiError(400, 'POLL_EXPIRED', 'This poll has expired');

  const conversation = await Conversation.findById(poll.conversationId);
  ensureGroupMember(conversation, req.user._id);

  const userId = toStr(req.user._id);

  // Xóa vote cũ của user này
  poll.options.forEach((opt) => {
    opt.votes = opt.votes.filter((v) => toStr(v) !== userId);
  });

  // Validate và thêm vote mới
  if (!Array.isArray(optionIndexes) || optionIndexes.length === 0) {
    throw new ApiError(400, 'INVALID_VOTE', 'Must select at least one option');
  }
  if (!poll.isMultipleChoice && optionIndexes.length > 1) {
    throw new ApiError(400, 'SINGLE_CHOICE_ONLY', 'This poll only allows one selection');
  }

  for (const idx of optionIndexes) {
    if (idx < 0 || idx >= poll.options.length) {
      throw new ApiError(400, 'INVALID_OPTION_INDEX', `Option index ${idx} is out of range`);
    }
    poll.options[idx].votes.push(req.user._id);
  }

  await poll.save();
  await poll.populate('createdBy', 'username avatarUrl');
  // Populate votes để FE hiển thị avatar người bình chọn (nếu không ẩn danh)
  await poll.populate('options.votes', 'username avatarUrl');

  // Thông báo hệ thống khi tham gia bình chọn
  const senderName = req.user.fullName || req.user.username;

  // Nếu bình chọn ẩn danh → ẩn tên trong system message và trong data trả về
  const systemContent = poll.isAnonymous
    ? `Ai đó đã tham gia bình chọn: "${poll.question}"`
    : `${senderName} đã tham gia bình chọn: "${poll.question}"`;

  const sysMsg = await Message.create({
    conversationId: poll.conversationId,
    senderId: req.user._id,
    content: systemContent,
    type: 'system',
    pollId: poll._id
  });
  await sysMsg.populate('senderId', 'username avatarUrl fullName');
  socketService.emitToConversation(poll.conversationId.toString(), 'new_message', sysMsg);
  socketService.emitConversationUpdated(poll.conversationId.toString(), {
    conversationId: poll.conversationId,
    latestMessage: sysMsg
  });

  // Build safe poll data trước khi emit/return
  const safePoll = poll.toObject();
  if (poll.isAnonymous) {
    safePoll.options = safePoll.options.map((opt) => ({
      ...opt,
      votes: opt.votes.map(() => null), // giữ count nhưng ẩn thông tin người chọn
    }));
  }

  socketService.emitPollUpdated(poll.conversationId.toString(), safePoll);

  return successResponse(res, safePoll, 'Vote submitted');
});

/**
 * PUT /api/v1/polls/:id/close
 * Đóng poll (Admin/Owner/Creator)
 */
const closePoll = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const poll = await Poll.findById(id);
  if (!poll) throw new ApiError(404, 'POLL_NOT_FOUND', 'Poll not found');

  const conversation = await Conversation.findById(poll.conversationId);
  const isCreator = toStr(poll.createdBy) === toStr(req.user._id);
  if (!isCreator) ensureAdminOrOwner(conversation, req.user._id);

  poll.isClosed = true;
  await poll.save();

  const senderName = req.user.fullName || req.user.username;
  const sysMsg = await Message.create({
    conversationId: poll.conversationId,
    senderId: req.user._id,
    content: `${senderName} đã đóng bình chọn: "${poll.question}"`,
    type: 'system',
    pollId: poll._id,
  });
  await sysMsg.populate('senderId', 'username avatarUrl fullName');
  socketService.emitToConversation(poll.conversationId.toString(), 'new_message', sysMsg);
  socketService.emitConversationUpdated(poll.conversationId.toString(), {
    conversationId: poll.conversationId,
    latestMessage: sysMsg,
  });

  return successResponse(res, poll, 'Poll closed');
});

/**
 * GET /api/v1/polls?conversationId=xxx
 * Lấy danh sách polls trong conversation
 */
const listPolls = asyncHandler(async (req, res) => {
  const { conversationId, limit = 20 } = req.query;
  if (!conversationId) throw new ApiError(400, 'MISSING_CONVERSATION_ID', 'conversationId is required');

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureGroupMember(conversation, req.user._id);

  const polls = await Poll.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 50))
    .populate('createdBy', 'username avatarUrl');

  const safePolls = polls.map((poll) => {
    const safePoll = poll.toObject();
    if (safePoll.isAnonymous) {
      safePoll.options = safePoll.options.map((opt) => ({
        ...opt,
        votes: opt.votes.map(() => null), // Giữ số lượng nhưng xóa id
      }));
    }
    return safePoll;
  });

  return successResponse(res, { items: safePolls }, 'Polls fetched');
});

module.exports = { createPoll, getPoll, votePoll, closePoll, listPolls };

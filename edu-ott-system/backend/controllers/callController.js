const { generateZegoToken } = require('../services/callTokenService');
const callService = require('../services/callService');
const Conversation = require('../models/Conversation');
const CallSession = require('../models/CallSession');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');

/**
 * POST /api/v1/calls/token
 * Body: { roomId: string, userName?: string }
 */
const getCallToken = asyncHandler(async (req, res) => {
  const { roomId, userName } = req.body;

  if (!roomId || typeof roomId !== 'string') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'roomId is required');
  }
  // Cho phép cả call_, group_ và định dạng Direct Call (2 ID nối nhau)
  if (!/^(call_|group_)?[a-zA-Z0-9_:-]+$/.test(roomId)) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Invalid roomId format');
  }

  const userId = req.user._id.toString();
  const displayName = userName || req.user.username || 'User';
  const canAccess = await callService.canAccessRoom(roomId, userId);
  if (!canAccess) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not allowed to access this call room');
  }
  const token = generateZegoToken(userId, roomId);

  res.json({
    success: true,
    data: {
      appID: Number(process.env.ZEGO_APP_ID || 0),
      token,
      serverSecret: process.env.ZEGO_SERVER_SECRET || '',
      userID: userId,
      userName: displayName,
      roomId,
    },
  });
});

/**
 * POST /api/v1/calls/start
 * Body: { conversationId, callType, isGroup? }
 * Creates a call session and returns roomId + token.
 */
const startCall = asyncHandler(async (req, res) => {
  const { conversationId, callType = 'video', isGroup = false } = req.body;
  const userId = req.user._id.toString();

  if (!conversationId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'conversationId is required');
  }

  // Validate membership
  const isMember = await callService.validateMembership(conversationId, userId);
  if (!isMember) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this conversation');
  }

  // Check if caller is already in a call
  const alreadyInCall = await callService.isUserInCall(userId);
  if (alreadyInCall) {
    throw new ApiError(409, 'ALREADY_IN_CALL', 'You are already in a call');
  }

  // Get other participants
  const conversation = await Conversation.findById(conversationId).select('participants type');
  const targetUserIds = conversation.participants
    .map((p) => p.toString())
    .filter((p) => p !== userId);

  const roomId = `call_${conversationId}_${Date.now()}`;

  const session = await callService.startCallSession({
    roomId,
    conversationId,
    callType,
    isGroup: isGroup || conversation.type === 'group',
    initiatorId: userId,
    targetUserIds,
  });

  const kitToken = generateZegoToken(userId, roomId);

  res.status(201).json({
    success: true,
    data: {
      sessionId: session._id,
      roomId,
      token: kitToken,
      appID: Number(process.env.ZEGO_APP_ID || 0),
      userID: userId,
      userName: req.user.username,
    },
  });
});

/**
 * POST /api/v1/calls/end
 * Body: { roomId, reason? }
 */
const endCall = asyncHandler(async (req, res) => {
  const { roomId, reason = 'normal' } = req.body;

  if (!roomId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'roomId is required');
  }

  const session = await callService.endCallSession(roomId, reason);
  if (!session) {
    throw new ApiError(404, 'NOT_FOUND', 'Call session not found');
  }

  res.json({
    success: true,
    data: {
      sessionId: session._id,
      durationSeconds: session.durationSeconds,
      status: session.status,
    },
  });
});

/**
 * GET /api/v1/calls/history?conversationId=xxx&limit=20
 */
const getCallHistory = asyncHandler(async (req, res) => {
  const { conversationId, limit = 20 } = req.query;
  const userId = req.user._id.toString();

  if (!conversationId) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'conversationId is required');
  }

  const isMember = await callService.validateMembership(conversationId, userId);
  if (!isMember) {
    throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this conversation');
  }

  const sessions = await CallSession.find({ conversationId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 50))
    .populate('initiator', 'username avatarUrl')
    .lean();

  res.json({ success: true, data: sessions });
});

module.exports = { getCallToken, startCall, endCall, getCallHistory };

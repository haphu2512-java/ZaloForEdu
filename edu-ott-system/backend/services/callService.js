const CallSession = require('../models/CallSession');
const Conversation = require('../models/Conversation');
const { getRedis, isRedisAvailable, keyWithPrefix } = require('./redisClient');
const logger = require('../utils/logger');

const CALL_TIMEOUT_MS = 30_000; // 30 seconds ring timeout
const IN_CALL_TTL_SECONDS = 7200; // 2h max

const inCallKey = (userId) => keyWithPrefix(`user:${userId}:in_call`);

/**
 * Check if a user is currently in a call (via Redis).
 */
const isUserInCall = async (userId) => {
  if (!isRedisAvailable()) return false;
  const redis = getRedis();
  const val = await redis.get(inCallKey(userId));
  return !!val;
};

/**
 * Mark user as in-call in Redis.
 */
const setUserInCall = async (userId, roomId) => {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  await redis.set(inCallKey(userId), roomId, { EX: IN_CALL_TTL_SECONDS });
};

/**
 * Remove user's in-call status.
 */
const clearUserInCall = async (userId) => {
  if (!isRedisAvailable()) return;
  const redis = getRedis();
  await redis.del(inCallKey(userId));
};

/**
 * Create a new call session and return it.
 */
const startCallSession = async ({ roomId, conversationId, callType, isGroup, initiatorId, targetUserIds }) => {
  const participants = [
    { userId: initiatorId, joinedAt: new Date(), status: 'accepted' },
    ...targetUserIds.map((uid) => ({ userId: uid, status: 'invited' })),
  ];

  const session = await CallSession.create({
    roomId,
    conversationId,
    callType,
    isGroup,
    initiator: initiatorId,
    participants,
    status: 'ringing',
    startedAt: new Date(),
  });

  await setUserInCall(initiatorId, roomId);
  return session;
};

/**
 * Accept a call — update participant status and mark session active.
 */
const acceptCall = async (roomId, userId) => {
  const session = await CallSession.findOne({ roomId, status: { $in: ['ringing', 'active'] } });
  if (!session) return null;

  const participant = session.participants.find((p) => p.userId.toString() === userId);
  if (participant) {
    participant.status = 'accepted';
    participant.joinedAt = new Date();
  }

  session.status = 'active';
  await session.save();
  await setUserInCall(userId, roomId);
  return session;
};

/**
 * Decline a call for a specific user.
 */
const declineCall = async (roomId, userId) => {
  const session = await CallSession.findOne({ roomId, status: { $in: ['ringing', 'active'] } });
  if (!session) return null;

  const participant = session.participants.find((p) => p.userId.toString() === userId);
  if (participant) {
    participant.status = 'declined';
  }

  // If all invited participants declined → end call
  const pending = session.participants.filter(
    (p) => p.status === 'invited' || p.status === 'ringing',
  );
  if (pending.length === 0 && !session.isGroup) {
    session.status = 'declined';
    session.endedAt = new Date();
    session.endReason = 'declined';
    session.durationSeconds = 0;
  }

  await session.save();
  return session;
};

/**
 * End a call session.
 */
const endCallSession = async (roomId, reason = 'normal') => {
  const session = await CallSession.findOne({ roomId, status: { $in: ['ringing', 'active'] } });
  if (!session) return null;

  session.status = 'ended';
  session.endedAt = new Date();
  session.endReason = reason;
  if (session.startedAt) {
    session.durationSeconds = Math.floor((session.endedAt - session.startedAt) / 1000);
  }

  // Mark remaining invited as missed
  session.participants.forEach((p) => {
    if (p.status === 'invited' || p.status === 'ringing') {
      p.status = 'missed';
    }
    if (!p.leftAt && p.status === 'accepted') {
      p.leftAt = session.endedAt;
    }
  });

  await session.save();

  // Clear all participants' in-call status
  await Promise.all(
    session.participants.map((p) => clearUserInCall(p.userId.toString())),
  );

  return session;
};

/**
 * Handle timeout — if nobody answered after CALL_TIMEOUT_MS.
 */
const timeoutCall = async (roomId) => {
  return endCallSession(roomId, 'timeout');
};

/**
 * User leaves the call (for group calls).
 */
const leaveCall = async (roomId, userId) => {
  const session = await CallSession.findOne({ roomId, status: 'active' });
  if (!session) return null;

  const participant = session.participants.find((p) => p.userId.toString() === userId);
  if (participant) {
    participant.status = 'left';
    participant.leftAt = new Date();
  }

  await clearUserInCall(userId);

  // If no participants remain active → end call
  const activeParticipants = session.participants.filter((p) => p.status === 'accepted');
  if (activeParticipants.length <= 1) {
    return endCallSession(roomId, 'normal');
  }

  await session.save();
  return session;
};

/**
 * Validate that a user is a member of the conversation.
 */
const validateMembership = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).select('participants');
  if (!conversation) return false;
  return conversation.participants.some((p) => p.toString() === userId);
};

module.exports = {
  CALL_TIMEOUT_MS,
  isUserInCall,
  setUserInCall,
  clearUserInCall,
  startCallSession,
  acceptCall,
  declineCall,
  endCallSession,
  timeoutCall,
  leaveCall,
  validateMembership,
};

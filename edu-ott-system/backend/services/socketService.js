const { Server } = require('socket.io');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const CallSession = require('../models/CallSession');
const env = require('../config/env');
const { createMessage } = require('./messageService');
const presenceService = require('./presenceService');
const { verifyAccessToken, getDeviceTokenVersion } = require('./tokenService');
const { isTokenBlacklisted } = require('./tokenStore');
const logger = require('../utils/logger');

let io = null;

const canJoinConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).select('participants').lean();
  if (!conversation) return false;
  const userIdStr = userId.toString();
  return conversation.participants.some((p) => p.toString() === userIdStr);
};

const emitToConversation = (conversationId, event, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
};

const emitToCommunityChannel = (communityId, channelId, event, payload) => {
  if (!io) return;
  if (channelId) {
    io.to(`community:${communityId}:channel:${channelId}`).emit(event, payload);
    return;
  }
  io.to(`community:${communityId}`).emit(event, payload);
};

const emitToUser = (userId, event, payload) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
};

// Emit tới từng participant qua user room (dùng khi cần đảm bảo
// nhận được dù user chưa join conversation room — ví dụ: tab mới)
const emitConversationUpdated = (conversationId, payload, participants) => {
  if (!io) return;
  // Nếu truyền participants vào thì emit nhanh qua user room (không cần query DB)
  if (participants && participants.length > 0) {
    participants.forEach((p) => {
      const pid = p._id ? p._id.toString() : p.toString();
      io.to(`user:${pid}`).emit('conversation_updated', payload);
    });
    return;
  }
  // Fallback: emit tới conversation room (user đã join)
  io.to(`conversation:${conversationId}`).emit('conversation_updated', payload);
};

const emitMessageRecalled = (conversationId, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('message_recalled', payload);
};

const emitPinnedItemsUpdated = (conversationId, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('pinned_items_updated', payload);
};

const emitPollUpdated = (conversationId, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('poll_updated', payload);
};

const emitGroupUpdated = (conversationId, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit('group_updated', payload);
};

const closeSocket = async () => {
  if (!io) return;
  await new Promise((resolve) => {
    io.close(() => resolve());
  });
  io = null;
};

const initSocket = (server) => {
  const corsAllowAll = env.corsOrigins.includes('*');
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        if (corsAllowAll || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(null, false);
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const payload = verifyAccessToken(token);
      if (payload.type !== 'access' || (await isTokenBlacklisted(payload.jti))) {
        return next(new Error('Unauthorized'));
      }

      const user = await User.findById(payload.sub);
      if (!user || user.deletedAt) {
        return next(new Error('Unauthorized'));
      }

      // Dùng device-specific tokenVersion (giống HTTP auth middleware)
      const device = payload.device || 'web';
      const expectedVersion = getDeviceTokenVersion(user, device);
      if (expectedVersion !== payload.tokenVersion) {
        return next(new Error('Unauthorized'));
      }

      socket.user = user;
      return next();
    } catch (_error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    socket.join(`user:${userId}`);

    await presenceService.setOnline(userId);
    socket.broadcast.emit('user_online', { userId });

    socket.on('join_conversation', async ({ conversationId }) => {
      if (!conversationId) return;
      const allowed = await canJoinConversation(conversationId, socket.user._id);
      if (!allowed) {
        socket.emit('socket_error', { message: 'Bạn không có quyền tham gia phòng này' });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      socket.join(`community:${conversationId}`);
      socket.emit('joined_conversation', { conversationId });
    });

    socket.on('join_community_channel', async ({ communityId, channelId }) => {
      if (!communityId || !channelId) return;
      const allowed = await canJoinConversation(communityId, socket.user._id);
      if (!allowed) {
        socket.emit('socket_error', { message: 'Bạn không có quyền tham gia kênh này' });
        return;
      }
      socket.join(`community:${communityId}:channel:${channelId}`);
      socket.emit('joined_community_channel', { communityId, channelId });
    });

    socket.on('send_message', async (payload) => {
      try {
        const message = await createMessage({
          conversationId: payload.conversationId,
          senderId: socket.user._id,
          content: payload.content || '',
          mediaIds: payload.mediaIds || [],
          replyTo: payload.replyTo,
          forwardFrom: payload.forwardFrom,
          channelId: payload.channelId || null,
          type: payload.type || 'text',
          isPinnedAnnouncement: Boolean(payload.isPinnedAnnouncement),
        });
        if (message.type === 'announcement') {
          emitToCommunityChannel(payload.conversationId, payload.channelId || null, 'announcement', message);
        } else {
          emitToCommunityChannel(payload.conversationId, payload.channelId || null, 'new_message', message);
        }
        emitConversationUpdated(payload.conversationId, {
          conversationId: payload.conversationId,
          latestMessage: message,
        });
      } catch (error) {
        socket.emit('socket_error', { message: error.message });
      }
    });

    socket.on('typing', async ({ conversationId }) => {
      if (!conversationId) return;
      await presenceService.setTyping({ conversationId, userId });
      socket.to(`conversation:${conversationId}`).emit('typing', {
        conversationId,
        userId,
      });
    });

    socket.on('stop_typing', async ({ conversationId }) => {
      if (!conversationId) return;
      await presenceService.clearTyping({ conversationId, userId });
      socket.to(`conversation:${conversationId}`).emit('stop_typing', {
        conversationId,
        userId,
      });
    });

    socket.on('message_delivered', async ({ messageId }) => {
      if (!messageId) return;
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { deliveredTo: socket.user._id } },
        { returnDocument: 'after' },
      );
      if (!message) return;
      emitToConversation(message.conversationId.toString(), 'message_delivered', {
        messageId: message._id,
        userId,
      });
    });

    socket.on('message_seen', async ({ messageId }) => {
      if (!messageId) return;
      const message = await Message.findByIdAndUpdate(
        messageId,
        { $addToSet: { seenBy: socket.user._id, deliveredTo: socket.user._id } },
        { returnDocument: 'after' },
      );
      if (!message) return;
      emitToConversation(message.conversationId.toString(), 'message_seen', {
        messageId: message._id,
        userId,
      });
    });

    // ═══════════════════════════════════════════════
    // CALL EVENTS — full lifecycle with busy/timeout
    // ═══════════════════════════════════════════════
    const callService = require('./callService');

    // --- 1-1 Call ---
    socket.on('call_user', async ({ targetUserId, roomId, callerName, type, conversationId }) => {
      if (!targetUserId) return;

      // Check if target user is already in a call (busy)
      const targetBusy = await callService.isUserInCall(targetUserId);
      if (targetBusy) {
        socket.emit('call_busy', { targetUserId, roomId });
        return;
      }

      // Create call session if conversationId is provided
      if (conversationId) {
        try {
          // Deduplication: only block when an active/ringing session exists for this room.
          // For 1-1 calls, ended sessions may reuse the same roomId and should still create new system messages.
          const existingSession = await CallSession.findOne({ roomId, status: { $in: ['ringing', 'active'] } });
          
          if (!existingSession) {
            await callService.startCallSession({
              roomId,
              conversationId,
              callType: type || 'video',
              isGroup: false,
              initiatorId: userId,
              targetUserIds: [targetUserId],
            });

            // Emit system message for call start
            const sysMsg = await createMessage({
              conversationId,
              senderId: userId,
              type: 'system',
              content: `${callerName || 'Người dùng'} đã gọi ${type === 'video' ? 'video' : 'thoại'}`,
            });
            emitToConversation(conversationId, 'receive_message', sysMsg);
          }
        } catch (err) {
          logger.error(`Failed to create call session: ${err.message}`);
        }
      }

      socket.to(`user:${targetUserId}`).emit('incoming_call', {
        roomId,
        callerName,
        type,
        fromUserId: userId,
        conversationId,
      });

      // Auto-timeout after 30s if not answered
      setTimeout(async () => {
        try {
          const session = await callService.timeoutCall(roomId);
          if (session && session.endReason === 'timeout') {
            io.to(`user:${userId}`).emit('call:timeout', { roomId });
            io.to(`user:${targetUserId}`).emit('call:timeout', { roomId });

            // Emit missed call notification
            io.to(`user:${targetUserId}`).emit('missed_call', {
              roomId,
              callerName,
              type,
              fromUserId: userId,
              conversationId,
              timestamp: new Date().toISOString(),
            });

            // Add missed call system message
            if (conversationId) {
              const sysMsg = await createMessage({
                conversationId,
                senderId: userId,
                type: 'system',
                content: `Cuộc gọi nhỡ từ ${callerName || 'Người dùng'}`,
              });
              emitToConversation(conversationId, 'receive_message', sysMsg);
            }
          }
        } catch (_) { /* session may already be ended */ }
      }, callService.CALL_TIMEOUT_MS);
    });

    socket.on('call:accept', async ({ roomId, callerId }) => {
      await callService.acceptCall(roomId, userId);
      if (callerId) {
        socket.to(`user:${callerId}`).emit('call:accepted', { roomId, userId });
      }
    });

    socket.on('decline_call', async ({ callerId, roomId }) => {
      if (!callerId) return;
      await callService.declineCall(roomId, userId);
      socket.to(`user:${callerId}`).emit('call_declined', {
        message: 'Người dùng đang bận',
        roomId,
        userId,
      });
    });

    socket.on('call:end', async ({ roomId, reason }) => {
      const session = await callService.endCallSession(roomId, reason || 'normal');
      if (session) {
        // Notify all participants
        session.participants.forEach((p) => {
          io.to(`user:${p.userId.toString()}`).emit('call:ended', {
            roomId,
            reason: session.endReason,
            durationSeconds: session.durationSeconds,
          });
        });

        // Add system message if we have conversationId
        if (session.conversationId) {
          const durationStr = session.durationSeconds ? ` (${Math.floor(session.durationSeconds / 60).toString().padStart(2, '0')}:${(session.durationSeconds % 60).toString().padStart(2, '0')})` : '';
          const sysMsg = await createMessage({
            conversationId: session.conversationId,
            senderId: userId,
            type: 'system',
            content: `Cuộc gọi đã kết thúc${durationStr}`,
          });
          emitToConversation(session.conversationId.toString(), 'receive_message', sysMsg);
        }
      }
    });

    // --- Group Call ---
    socket.on('group_call_start', async ({ conversationId, roomId, callerName, type, inviteLink }) => {
      if (!conversationId || !roomId) return;

      try {
        const conversation = await Conversation.findById(conversationId).select('participants type');
        if (!conversation || conversation.type !== 'group') return;

        const isMember = conversation.participants.some(p => p.toString() === userId);
        if (!isMember) return;

        const otherParticipants = conversation.participants.filter(p => p.toString() !== userId);
        const targetUserIds = otherParticipants.map(p => p.toString());

        // Create group call session
        try {
          // Deduplication: only block when an active/ringing session exists for this room.
          const existingSession = await CallSession.findOne({ roomId, status: { $in: ['ringing', 'active'] } });
          
          if (!existingSession) {
            await callService.startCallSession({
              roomId,
              conversationId,
              callType: type || 'video',
              isGroup: true,
              initiatorId: userId,
              targetUserIds,
            });

            // Emit system message for group call start
            const sysMsg = await createMessage({
              conversationId,
              senderId: userId,
              type: 'system',
              content: `${callerName || 'Người dùng'} đã bắt đầu cuộc gọi nhóm`,
            });
            emitToConversation(conversationId, 'receive_message', sysMsg);
          }
        } catch (err) {
          logger.error(`Failed to create group call session: ${err.message}`);
        }

        otherParticipants.forEach((participantId) => {
          io.to(`user:${participantId.toString()}`).emit('incoming_group_call', {
            conversationId,
            roomId,
            callerName,
            type,
            fromUserId: userId,
            inviteLink: inviteLink || null,
            isGroup: true,
          });
        });

        socket.emit('group_call_started', { conversationId, roomId });
      } catch (err) {
        socket.emit('socket_error', { message: err.message });
      }
    });

    socket.on('group_call_decline', async ({ conversationId, roomId }) => {
      await callService.declineCall(roomId, userId);
      io.to(`conversation:${conversationId}`).emit('group_call_member_declined', {
        userId,
        roomId,
      });
    });

    socket.on('call:leave', async ({ roomId }) => {
      const session = await callService.leaveCall(roomId, userId);
      if (session && session.status === 'ended') {
        // Notify all participants about end
        session.participants.forEach((p) => {
          io.to(`user:${p.userId.toString()}`).emit('call:ended', {
            roomId,
            reason: session.endReason,
            durationSeconds: session.durationSeconds,
          });
        });

        // Emit system message
        if (session.conversationId) {
          const durationStr = session.durationSeconds ? ` (${Math.floor(session.durationSeconds / 60).toString().padStart(2, '0')}:${(session.durationSeconds % 60).toString().padStart(2, '0')})` : '';
          const sysMsg = await createMessage({
            conversationId: session.conversationId,
            senderId: userId,
            type: 'system',
            content: `Cuộc gọi đã kết thúc${durationStr}`,
          });
          emitToConversation(session.conversationId.toString(), 'receive_message', sysMsg);
        }
      }
    });

    // ─────────────────────────────────────────────
    // Disconnect (single handler)
    // ─────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const lastSeen = await presenceService.setOffline(userId);
      socket.broadcast.emit('user_offline', { userId, lastSeen: lastSeen.toISOString() });

      // Clean up any active call state for this user
      await callService.clearUserInCall(userId);
    });
  });



  logger.info('Socket.IO initialized');
  return io;
};

module.exports = initSocket;
module.exports.emitToConversation = emitToConversation;
module.exports.emitToCommunityChannel = emitToCommunityChannel;
module.exports.emitConversationUpdated = emitConversationUpdated;
module.exports.emitMessageRecalled = emitMessageRecalled;
module.exports.emitPinnedItemsUpdated = emitPinnedItemsUpdated;
module.exports.emitPollUpdated = emitPollUpdated;
module.exports.emitGroupUpdated = emitGroupUpdated;
module.exports.emitToUser = emitToUser;
module.exports.closeSocket = closeSocket;

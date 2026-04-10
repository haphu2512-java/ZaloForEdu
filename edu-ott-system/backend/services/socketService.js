const { Server } = require('socket.io');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const env = require('../config/env');
const { createMessage } = require('./messageService');
const presenceService = require('./presenceService');
const { verifyAccessToken } = require('./tokenService');
const { isTokenBlacklisted } = require('./tokenStore');
const logger = require('../utils/logger');

let io = null;

const canJoinConversation = async (conversationId, userId) => {
  const conversation = await Conversation.findById(conversationId).select('_id participants');
  if (!conversation) return false;
  return conversation.participants.some((participantId) => participantId.equals(userId));
};

const emitToConversation = (conversationId, event, payload) => {
  if (!io) return;
  io.to(`conversation:${conversationId}`).emit(event, payload);
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
      if (!user || user.deletedAt || user.tokenVersion !== payload.tokenVersion) {
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
        socket.emit('socket_error', { message: 'Not allowed to join this room' });
        return;
      }
      socket.join(`conversation:${conversationId}`);
      socket.emit('joined_conversation', { conversationId });
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
        });
        emitToConversation(payload.conversationId, 'new_message', message);
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
        { new: true },
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
        { new: true },
      );
      if (!message) return;
      emitToConversation(message.conversationId.toString(), 'message_seen', {
        messageId: message._id,
        userId,
      });
    });

    socket.on('disconnect', async () => {
      const lastSeen = await presenceService.setOffline(userId);
      socket.broadcast.emit('user_offline', { userId, lastSeen: lastSeen.toISOString() });
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

module.exports = initSocket;
module.exports.emitToConversation = emitToConversation;
module.exports.closeSocket = closeSocket;

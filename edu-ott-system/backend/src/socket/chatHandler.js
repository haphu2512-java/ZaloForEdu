const socketService = require('../services/socketService');

/**
 * Handle chat-related socket events
 * Events: join:room, leave:room, message:send, message:read, typing:start, typing:stop
 */
module.exports = (io, socket) => {
  // ─── join:room ──────────────────────────────────────────────
  // Client joins a chat room (class/group/conversation)
  socket.on('join:room', (roomId) => {
    socket.join(roomId);
    console.log(`📥 [join:room] ${socket.user.fullName} joined room: ${roomId}`);

    // Notify other members in the room
    socket.to(roomId).emit('room:user-joined', {
      userId: socket.userId,
      fullName: socket.user.fullName,
      avatar: socket.user.avatar,
      roomId,
    });
  });

  // ─── leave:room ─────────────────────────────────────────────
  // Client leaves a chat room
  socket.on('leave:room', (roomId) => {
    socket.leave(roomId);
    console.log(`📤 [leave:room] ${socket.user.fullName} left room: ${roomId}`);

    // Notify other members in the room
    socket.to(roomId).emit('room:user-left', {
      userId: socket.userId,
      fullName: socket.user.fullName,
      roomId,
    });
  });

  // ─── message:send ───────────────────────────────────────────
  // Client sends a message — save to DB, then broadcast
  socket.on('message:send', async (data) => {
    try {
      const message = await socketService.saveMessage(data, socket.userId);

      // Send back to sender as confirmation
      socket.emit('message:sent', message);

      // Broadcast to all others in the room
      socket.to(data.roomId).emit('message:new', message);
    } catch (error) {
      console.error(`❌ [message:send] Error:`, error.message);
      socket.emit('error', { event: 'message:send', message: error.message });
    }
  });

  // ─── message:read ───────────────────────────────────────────
  // Client marks a message as read
  socket.on('message:read', async ({ messageId, roomId }) => {
    try {
      await socketService.markMessageAsRead(messageId, socket.userId);

      // Broadcast read receipt to room
      socket.to(roomId).emit('message:read', {
        messageId,
        userId: socket.userId,
        fullName: socket.user.fullName,
        readAt: new Date(),
      });
    } catch (error) {
      console.error(`❌ [message:read] Error:`, error.message);
    }
  });

  // ─── typing:start ──────────────────────────────────────────
  // Client starts typing
  socket.on('typing:start', ({ roomId }) => {
    socket.to(roomId).emit('typing:start', {
      userId: socket.userId,
      fullName: socket.user.fullName,
      avatar: socket.user.avatar,
      roomId,
    });
  });

  // ─── typing:stop ───────────────────────────────────────────
  // Client stops typing
  socket.on('typing:stop', ({ roomId }) => {
    socket.to(roomId).emit('typing:stop', {
      userId: socket.userId,
      roomId,
    });
  });
};

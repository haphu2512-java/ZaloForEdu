const jwt = require('jsonwebtoken');
const User = require('../models/User');
const socketService = require('../services/socketService');
const chatHandler = require('./chatHandler');
const callHandler = require('./callHandler');

const initializeSocket = (io) => {
  // ─── Authentication Middleware ──────────────────────────────
  // Verify JWT token before allowing socket connection
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth.token ||
        socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ─── Connection Handler ────────────────────────────────────
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.fullName} (${socket.userId})`);

    // Register user as active
    socketService.addActiveUser(socket.userId, socket.id, socket.user);

    // Update last login
    socketService.updateLastLogin(socket.userId);

    // Join user to their personal room (for direct messages / call signals)
    socket.join(`user:${socket.userId}`);

    // ─── Broadcast online status ───────────────────────────
    // user:online → all connected clients
    io.emit('user:online', {
      userId: socket.userId,
      fullName: socket.user.fullName,
      avatar: socket.user.avatar,
      onlineAt: new Date(),
    });

    // Send current online users to the newly connected user
    socket.emit('users:online-list', socketService.getActiveUsers());

    // ─── Register event handlers ───────────────────────────
    chatHandler(io, socket);
    callHandler(io, socket);

    // ─── Disconnect Handler ────────────────────────────────
    // user:offline → all connected clients
    socket.on('disconnect', (reason) => {
      console.log(`❌ User disconnected: ${socket.user.fullName} (${socket.userId}) - ${reason}`);

      // Remove from active users
      socketService.removeActiveUser(socket.userId);

      // Broadcast offline status
      io.emit('user:offline', {
        userId: socket.userId,
        fullName: socket.user.fullName,
        disconnectedAt: new Date(),
      });
    });

    // ─── Error Handler ─────────────────────────────────────
    socket.on('error', (error) => {
      console.error(`⚠️ Socket error for ${socket.user.fullName}:`, error.message);
    });
  });

  return io;
};

module.exports = {
  initializeSocket,
  getActiveUsers: () => socketService.getActiveUsers(),
  isUserOnline: (userId) => socketService.isUserOnline(userId),
};

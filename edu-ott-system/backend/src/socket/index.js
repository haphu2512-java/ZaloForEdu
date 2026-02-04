const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Store active connections
const activeUsers = new Map();

const initializeSocket = (io) => {
  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
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

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.fullName} (${socket.userId})`);
    
    // Store active user
    activeUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      connectedAt: new Date(),
    });

    // Broadcast online status
    io.emit('user:online', {
      userId: socket.userId,
      fullName: socket.user.fullName,
      avatar: socket.user.avatar,
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle joining class/group rooms
    socket.on('join:room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.userId} joined room: ${roomId}`);
    });

    // Handle leaving rooms
    socket.on('leave:room', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.userId} left room: ${roomId}`);
    });

    // Handle typing indicator
    socket.on('typing:start', ({ roomId }) => {
      socket.to(roomId).emit('typing:start', {
        userId: socket.userId,
        fullName: socket.user.fullName,
        roomId,
      });
    });

    socket.on('typing:stop', ({ roomId }) => {
      socket.to(roomId).emit('typing:stop', {
        userId: socket.userId,
        roomId,
      });
    });

    // Handle new message (real-time notification)
    socket.on('message:send', (data) => {
      // Broadcast to room members
      socket.to(data.roomId).emit('message:new', {
        ...data,
        sender: {
          _id: socket.userId,
          fullName: socket.user.fullName,
          avatar: socket.user.avatar,
        },
      });
    });

    // Handle message read receipt
    socket.on('message:read', ({ messageId, roomId }) => {
      socket.to(roomId).emit('message:read', {
        messageId,
        userId: socket.userId,
        readAt: new Date(),
      });
    });

    // Handle video call signals
    socket.on('call:offer', ({ to, offer }) => {
      io.to(`user:${to}`).emit('call:offer', {
        from: socket.userId,
        offer,
        caller: {
          fullName: socket.user.fullName,
          avatar: socket.user.avatar,
        },
      });
    });

    socket.on('call:answer', ({ to, answer }) => {
      io.to(`user:${to}`).emit('call:answer', {
        from: socket.userId,
        answer,
      });
    });

    socket.on('call:ice-candidate', ({ to, candidate }) => {
      io.to(`user:${to}`).emit('call:ice-candidate', {
        from: socket.userId,
        candidate,
      });
    });

    socket.on('call:end', ({ to }) => {
      io.to(`user:${to}`).emit('call:end', {
        from: socket.userId,
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.fullName} (${socket.userId})`);
      
      // Remove from active users
      activeUsers.delete(socket.userId);

      // Broadcast offline status
      io.emit('user:offline', {
        userId: socket.userId,
        disconnectedAt: new Date(),
      });
    });
  });

  // Return io instance for use in other parts of the app
  return io;
};

const getActiveUsers = () => {
  return Array.from(activeUsers.values()).map((user) => ({
    userId: user.user._id,
    fullName: user.user.fullName,
    avatar: user.user.avatar,
    connectedAt: user.connectedAt,
  }));
};

const isUserOnline = (userId) => {
  return activeUsers.has(userId.toString());
};

module.exports = {
  initializeSocket,
  getActiveUsers,
  isUserOnline,
};

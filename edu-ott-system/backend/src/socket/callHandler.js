/**
 * Handle video/voice call socket events (WebRTC signaling)
 * Events: call:offer, call:answer, call:ice-candidate, call:end
 */
module.exports = (io, socket) => {
  // ─── call:offer ─────────────────────────────────────────────
  // Caller sends WebRTC offer to a specific user
  socket.on('call:offer', ({ to, offer, roomId, callType }) => {
    console.log(`📞 [call:offer] ${socket.user.fullName} → User:${to} (${callType || 'video'})`);

    io.to(`user:${to}`).emit('call:offer', {
      from: socket.userId,
      offer,
      roomId,
      callType: callType || 'video',
      caller: {
        _id: socket.userId,
        fullName: socket.user.fullName,
        avatar: socket.user.avatar,
      },
    });
  });

  // ─── call:answer ────────────────────────────────────────────
  // Callee sends WebRTC answer back to the caller
  socket.on('call:answer', ({ to, answer }) => {
    console.log(`📞 [call:answer] ${socket.user.fullName} → User:${to}`);

    io.to(`user:${to}`).emit('call:answer', {
      from: socket.userId,
      answer,
      answerer: {
        _id: socket.userId,
        fullName: socket.user.fullName,
        avatar: socket.user.avatar,
      },
    });
  });

  // ─── call:ice-candidate ────────────────────────────────────
  // Exchange ICE candidates for NAT traversal
  socket.on('call:ice-candidate', ({ to, candidate }) => {
    io.to(`user:${to}`).emit('call:ice-candidate', {
      from: socket.userId,
      candidate,
    });
  });

  // ─── call:end ──────────────────────────────────────────────
  // Either party ends the call
  socket.on('call:end', ({ to, roomId }) => {
    console.log(`📞 [call:end] ${socket.user.fullName} ended call with User:${to}`);

    io.to(`user:${to}`).emit('call:end', {
      from: socket.userId,
      roomId,
      endedBy: {
        _id: socket.userId,
        fullName: socket.user.fullName,
      },
    });
  });

  // ─── call:reject ───────────────────────────────────────────
  // Callee rejects the incoming call
  socket.on('call:reject', ({ to, reason }) => {
    console.log(`📞 [call:reject] ${socket.user.fullName} rejected call from User:${to}`);

    io.to(`user:${to}`).emit('call:rejected', {
      from: socket.userId,
      reason: reason || 'User rejected the call',
      rejectedBy: {
        _id: socket.userId,
        fullName: socket.user.fullName,
      },
    });
  });

  // ─── call:busy ─────────────────────────────────────────────
  // Callee is already in a call
  socket.on('call:busy', ({ to }) => {
    io.to(`user:${to}`).emit('call:busy', {
      from: socket.userId,
      user: {
        _id: socket.userId,
        fullName: socket.user.fullName,
      },
    });
  });
};

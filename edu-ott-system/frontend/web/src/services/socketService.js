import { io } from "socket.io-client";

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
};

class SocketService {
  constructor() {
    this.socket = null;
    this._notifCallback = null;
    this._pendingListeners = []; // listeners registered before connect()
  }

  connect(explicitToken = null) {
    if (this.socket) return; 
    const token = explicitToken || localStorage.getItem("token");
    if (!token) return;

    this.socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
      // Flush any listeners registered before socket was ready
      this._pendingListeners.forEach(({ event, callback }) => {
        this.socket.on(event, callback);
      });
      this._pendingListeners = [];
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);

      // If auth fails, try to reconnect with fresh token
      if (err.message === 'Unauthorized') {
        const freshToken = localStorage.getItem("token");
        if (freshToken && this.socket) {
          this.socket.auth = { token: freshToken };
        }
      }
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    // Lắng nghe notification realtime từ backend
    this.socket.on("new_notification", (notification) => {
      // Import động để tránh circular dependency
      import("../store/notificationStore").then(({ useNotificationStore }) => {
        useNotificationStore.getState().addSocketNotification(notification);
      });
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Reconnect with a fresh token (after token refresh).
   */
  reconnectWithToken(newToken) {
    this.disconnect();
    this.connect(newToken);
  }

  emitTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit("typing", { conversationId });
    }
  }

  emitStopTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit("stop_typing", { conversationId });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      // Queue until socket is ready
      this._pendingListeners.push({ event, callback });
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // ─── 1-1 Call ───

  callUser({ targetUserId, roomId, callerName, type, conversationId }) {
    if (!this.socket?.connected) {
      console.error("❌ Socket chưa connected, không thể gọi điện!");
      return false;
    }
    this.socket.emit("call_user", { targetUserId, roomId, callerName, type, conversationId });
    return true;
  }

  declineCall({ callerId, roomId }) {
    if (this.socket?.connected) {
      this.socket.emit("decline_call", { callerId, roomId });
    }
  }

  acceptCall({ roomId, callerId }) {
    if (this.socket?.connected) {
      this.socket.emit("call:accept", { roomId, callerId });
    }
  }

  endCall({ roomId, reason = 'normal' }) {
    if (this.socket?.connected) {
      this.socket.emit("call:end", { roomId, reason });
    }
  }

  leaveCall({ roomId }) {
    if (this.socket?.connected) {
      this.socket.emit("call:leave", { roomId });
    }
  }

  // ─── Group Call ───

  /**
   * Bắt đầu cuộc gọi nhóm — server sẽ broadcast tới tất cả thành viên
   */
  startGroupCall({ conversationId, roomId, callerName, type, inviteLink }) {
    if (!this.socket?.connected) {
      console.error("❌ Socket chưa connected, không thể gọi nhóm!");
      return false;
    }
    this.socket.emit("group_call_start", {
      conversationId,
      roomId,
      callerName,
      type,
      inviteLink,
    });
    return true;
  }

  /** Từ chối group call */
  declineGroupCall({ conversationId, roomId }) {
    if (this.socket?.connected) {
      this.socket.emit("group_call_decline", { conversationId, roomId });
    }
  }
}

export const socketService = new SocketService();
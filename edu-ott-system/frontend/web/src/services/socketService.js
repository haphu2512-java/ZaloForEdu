import { io } from "socket.io-client";

const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
};

class SocketService {
  constructor() {
    this.socket = null;
    this._notifCallback = null;
  }

  connect() {
    if (this.socket?.connected) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    this.socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      console.log("Socket connected:", this.socket.id);
    });

    this.socket.on("connect_error", (err) => {
      console.error("Socket error:", err.message);
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

  emitTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit("typing", { conversationId });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  // Gọi điện cho người khác - emit call_user lên server
  callUser({ targetUserId, roomId, callerName, type }) {
    if (!this.socket?.connected) {
      console.error("❌ Socket chưa connected, không thể gọi điện!");
      return false;
    }
    this.socket.emit("call_user", { targetUserId, roomId, callerName, type });
    console.log("✅ call_user emitted:", { targetUserId, roomId, type });
    return true;
  }

  // Từ chối cuộc gọi - báo cho người gọi biết
  declineCall({ callerId, roomId }) {
    if (this.socket?.connected) {
      this.socket.emit("decline_call", { callerId, roomId });
    }
  }
}

export const socketService = new SocketService();
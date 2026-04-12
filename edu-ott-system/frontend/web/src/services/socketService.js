import { io } from "socket.io-client";

// Get base URL by stripping /api/v1 from API_URL, or use default backend URL
const getSocketUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  return apiUrl.replace(/\/api\/v1\/?$/, "");
};

class SocketService {
  constructor() {
    this.socket = null;
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
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Common emitters for user-driven actions
  emitTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit("typing", { conversationId });
    }
  }

  // Handlers binding mechanism
  on(event, callback) {
    if (this.socket) {
      // Remove any existing listeners of the same event by returning a cleanup func if needed
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }
}

export const socketService = new SocketService();

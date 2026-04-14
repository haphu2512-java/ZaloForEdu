import api from "./authService";

export const notificationService = {
  getNotifications: (page = 1, limit = 20) =>
    api.get("/notifications", { params: { page, limit } }),

  markAsRead: (notificationId) =>
    api.put(`/notifications/${notificationId}/read`),

  markAllAsRead: () =>
    api.put("/notifications/read-all"),

  deleteNotification: (notificationId) =>
    api.delete(`/notifications/${notificationId}`),

  getUnreadCount: () =>
    api.get("/notifications/unread-count"),
};

import { create } from "zustand";
import { notificationService } from "../services/notificationService";

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  hasMore: false,
  page: 1,

  fetchNotifications: async (refresh = false) => {
    set({ isLoading: true });
    try {
      const page = refresh ? 1 : get().page;
      const res = await notificationService.getNotifications(page, 20);
      const data = res.data?.data;
      const items = data?.notifications || data?.items || [];
      const total = data?.pagination?.total || items.length;
      set((state) => ({
        notifications: refresh ? items : [...state.notifications, ...items],
        hasMore: (refresh ? items.length : state.notifications.length + items.length) < total,
        page: refresh ? 2 : state.page + 1,
        isLoading: false,
      }));
    } catch {
      set({ isLoading: false });
    }
  },

  fetchUnreadCount: async () => {
    try {
      const res = await notificationService.getUnreadCount();
      set({ unreadCount: res.data?.data?.count || 0 });
    } catch {}
  },

  markAsRead: async (id) => {
    try {
      await notificationService.markAsRead(id);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n._id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch {}
  },

  markAllAsRead: async () => {
    try {
      await notificationService.markAllAsRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch {}
  },

  deleteNotification: async (id) => {
    try {
      await notificationService.deleteNotification(id);
      set((state) => ({
        notifications: state.notifications.filter((n) => n._id !== id),
        unreadCount: state.notifications.find((n) => n._id === id && !n.isRead)
          ? Math.max(0, state.unreadCount - 1)
          : state.unreadCount,
      }));
    } catch {}
  },

  addSocketNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));

// ============================================================
// Notification Types - Khớp Backend Notification Model
// ============================================================

/** Backend Notification model */
export interface Notification {
  _id: string;
  id?: string;
  userId: string;
  type: string; // 'info', 'warning', 'error', 'friend_request', 'message', etc
  title: string;
  body: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Pagination response for notifications */
export interface NotificationListResponse {
  items: Notification[];
  nextCursor: string | null;
  limit: number;
}

/** POST /notifications/mark-read body */
export interface MarkNotificationReadPayload {
  notificationIds: string[];
}

/** POST /notifications/mark-all-read body */
export interface MarkAllNotificationReadPayload {
  type?: string; // optional: mark only specific type
}

/** Notification filter params */
export interface NotificationFilterParams {
  isRead?: boolean;
  type?: string;
  limit?: number;
  cursor?: string;
}

/** Socket event for new notification */
export interface NotificationSocketEvent {
  notification: Notification;
  event: 'new_notification' | 'notification_read';
}

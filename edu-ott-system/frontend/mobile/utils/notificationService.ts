import { fetchAPI } from './api';
import type { NotificationItem, PaginatedResponse } from '../types/chat';

const NOTIFICATIONS_ENDPOINT = '/notifications';

function normalizeNotification(item: NotificationItem): NotificationItem {
  return {
    ...item,
    _id: item._id || item.id || '',
    id: item.id || item._id || '',
  };
}

export async function getNotifications(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<NotificationItem>> {
  const res = await fetchAPI(
    `${NOTIFICATIONS_ENDPOINT}?page=${page}&limit=${limit}`,
  );
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeNotification),
  };
}

export async function markNotificationRead(
  notificationId: string,
): Promise<NotificationItem> {
  const res = await fetchAPI(`${NOTIFICATIONS_ENDPOINT}/${notificationId}/read`, {
    method: 'PUT',
  });
  return normalizeNotification(res.data);
}

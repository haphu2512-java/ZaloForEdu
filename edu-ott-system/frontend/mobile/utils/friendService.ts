import { fetchAPI } from './api';
import type {
  PaginatedResponse,
  UserInfo,
} from '../types/chat';
import type { FriendRequest, SendFriendRequestPayload } from '../types/friend';
import { normalizeUser } from './normalizers';

// ============================================================
// Friend Service - Backend endpoints: /api/v1/friends/*
// ============================================================

const FRIENDS_ENDPOINT = '/friends';

/**
 * Gửi lời mời kết bạn
 * POST /friends/request { toUserId }
 */
export async function sendFriendRequest(
  payload: SendFriendRequestPayload,
): Promise<FriendRequest> {
  const res = await fetchAPI(`${FRIENDS_ENDPOINT}/request`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

/**
 * Chấp nhận lời mời kết bạn
 * PUT /friends/request/:id/accept
 */
export async function acceptFriendRequest(
  requestId: string,
): Promise<FriendRequest> {
  const res = await fetchAPI(
    `${FRIENDS_ENDPOINT}/request/${requestId}/accept`,
    {
      method: 'PUT',
    },
  );
  return res.data;
}

/**
 * Từ chối lời mời kết bạn
 * PUT /friends/request/:id/reject
 */
export async function rejectFriendRequest(
  requestId: string,
): Promise<FriendRequest> {
  const res = await fetchAPI(
    `${FRIENDS_ENDPOINT}/request/${requestId}/reject`,
    {
      method: 'PUT',
    },
  );
  return res.data;
}

/**
 * Xóa bạn bè
 * DELETE /friends/:friendId
 */
export async function removeFriend(friendId: string): Promise<void> {
  await fetchAPI(`${FRIENDS_ENDPOINT}/${friendId}`, {
    method: 'DELETE',
  });
}

/**
 * Lấy danh sách bạn bè
 * GET /friends/list?limit=&cursor=
 */
export async function getFriendList(
  cursor: string | null = null,
  limit: number = 20,
): Promise<PaginatedResponse<UserInfo>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(`${FRIENDS_ENDPOINT}/list?${params.toString()}`);
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeUser),
  };
}

/**
 * Lấy danh sách lời mời kết bạn đến (pending)
 * GET /friends/request/incoming?limit=&cursor=
 */
export async function getIncomingFriendRequests(
  cursor: string | null = null,
  limit: number = 20,
): Promise<PaginatedResponse<FriendRequest>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(
    `${FRIENDS_ENDPOINT}/request/incoming?${params.toString()}`,
  );
  return res.data;
}

/**
 * Lấy danh sách lời mời kết bạn đi (pending)
 * GET /friends/request/outgoing?limit=&cursor=
 */
export async function getOutgoingFriendRequests(
  cursor: string | null = null,
  limit: number = 20,
): Promise<PaginatedResponse<FriendRequest>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(
    `${FRIENDS_ENDPOINT}/request/outgoing?${params.toString()}`,
  );
  return res.data;
}

/**
 * Gửi lời mời kết bạn theo danh sách user id.
 * Dùng cho các flow đồng bộ danh bạ / gợi ý bạn bè.
 */
export async function sendFriendRequestsBulk(
  userIds: string[],
): Promise<{ successIds: string[]; failedIds: string[] }> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  const results = await Promise.allSettled(
    uniqueIds.map((toUserId) => sendFriendRequest({ toUserId })),
  );

  const successIds: string[] = [];
  const failedIds: string[] = [];

  results.forEach((result, index) => {
    const id = uniqueIds[index];
    if (result.status === 'fulfilled') successIds.push(id);
    else failedIds.push(id);
  });

  return { successIds, failedIds };
}

import { fetchAPI } from './api';
import type {
  FriendRequest,
  SendFriendRequestPayload,
  PaginatedResponse,
  UserInfo,
} from '../types/chat';

// ============================================================
// Friend Service - Backend endpoints: /api/v1/friends/*
// ============================================================

const FRIENDS_ENDPOINT = '/friends';

function normalizeUser(user: UserInfo): UserInfo {
  return {
    ...user,
    _id: user._id || user.id || '',
    id: user.id || user._id || '',
  };
}

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
 * GET /friends/list?page=&limit=
 */
export async function getFriendList(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<UserInfo>> {
  const res = await fetchAPI(
    `${FRIENDS_ENDPOINT}/list?page=${page}&limit=${limit}`,
  );
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeUser),
  };
}

/**
 * Lấy danh sách lời mời kết bạn đến (pending)
 * GET /friends/request/incoming?page=&limit=
 */
export async function getIncomingFriendRequests(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<FriendRequest>> {
  const res = await fetchAPI(
    `${FRIENDS_ENDPOINT}/request/incoming?page=${page}&limit=${limit}`,
  );
  return res.data;
}

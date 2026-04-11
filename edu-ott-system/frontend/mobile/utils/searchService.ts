import { fetchAPI } from './api';
import type { UserInfo, PaginatedResponse } from '../types/chat';

// ============================================================
// Search Service - Backend endpoints: /api/v1/search/*
// ============================================================

const SEARCH_ENDPOINT = '/search';

function normalizeUser(user: UserInfo): UserInfo {
  return {
    ...user,
    _id: user._id || user.id || '',
    id: user.id || user._id || '',
  };
}

/**
 * Tìm kiếm users theo username, email hoặc phone
 * GET /search/users?q=&limit=&cursor=
 */
export async function searchUsers(
  query: string,
  cursor: string | null = null,
  limit: number = 20,
): Promise<PaginatedResponse<UserInfo>> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(`${SEARCH_ENDPOINT}/users?${params.toString()}`);
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeUser),
  };
}

/**
 * Tìm kiếm messages trong conversations của user
 * GET /search/messages?q=&limit=&cursor=
 */
export async function searchMessages(
  query: string,
  cursor: string | null = null,
  limit: number = 20,
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
  });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(
    `${SEARCH_ENDPOINT}/messages?${params.toString()}`,
  );
  return res.data;
}

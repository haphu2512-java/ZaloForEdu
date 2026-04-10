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
 * GET /search/users?q=&page=&limit=
 */
export async function searchUsers(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<UserInfo>> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetchAPI(`${SEARCH_ENDPOINT}/users?${params.toString()}`);
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeUser),
  };
}

/**
 * Tìm kiếm messages trong conversations của user
 * GET /search/messages?q=&page=&limit=
 */
export async function searchMessages(
  query: string,
  page: number = 1,
  limit: number = 20,
): Promise<any> {
  const params = new URLSearchParams({
    q: query,
    page: String(page),
    limit: String(limit),
  });
  const res = await fetchAPI(
    `${SEARCH_ENDPOINT}/messages?${params.toString()}`,
  );
  return res.data;
}

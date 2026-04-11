// ============================================================
// Search Types - API Response Types cho Search Endpoints
// ============================================================

import { Message, UserInfo } from './chat';

/** Search result type union */
export type SearchResult = Message | UserInfo | SearchConversationItem;

/** Conversation result format cho search */
export interface SearchConversationItem {
  _id: string;
  id?: string;
  type: 'direct' | 'group';
  name?: string | null;
  avatarUrl?: string | null;
  participants: UserInfo[];
  lastMessageAt?: string | null;
}

/** GET /search/messages params */
export interface SearchMessagesParams {
  q: string; // search query
  limit?: number;
  cursor?: string;
}

/** GET /search/messages response */
export interface SearchMessagesResponse {
  items: Message[];
  nextCursor: string | null;
  limit: number;
  query: string;
  totalFound?: number;
}

/** GET /search/users params */
export interface SearchUsersParams {
  q: string; // username, email, hoặc phone
  limit?: number;
  cursor?: string;
}

/** GET /search/users response */
export interface SearchUsersResponse {
  items: UserInfo[];
  nextCursor: string | null;
  limit: number;
  query: string;
}

/** GET /search/conversations params (nếu tồn tại) */
export interface SearchConversationsParams {
  q: string; // conversation name
  limit?: number;
  cursor?: string;
}

/** GET /search/conversations response */
export interface SearchConversationsResponse {
  items: SearchConversationItem[];
  nextCursor: string | null;
  limit: number;
  query: string;
}

/** Search tab state */
export interface SearchTabState {
  messages: SearchMessagesResponse | null;
  users: SearchUsersResponse | null;
  conversations: SearchConversationsResponse | null;
  loading: boolean;
  error: string | null;
}

/** Unified search response (nếu có endpoint chung) */
export interface UnifiedSearchResponse {
  messages: SearchMessagesResponse;
  users: SearchUsersResponse;
  conversations?: SearchConversationsResponse;
}

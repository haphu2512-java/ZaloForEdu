// ============================================================
// Friend & Relationship Types - Backend Models
// ============================================================

import { UserInfo } from './chat';

/** Backend FriendRequest model */
export interface FriendRequest {
  _id: string;
  id?: string;
  fromUserId: string | UserInfo;
  toUserId: string | UserInfo;
  status: 'pending' | 'accepted' | 'rejected';
  respondedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Friend list item */
export interface FriendListItem extends UserInfo {
  addedAt?: string; // when they became friends
}

/** GET /friends/list response */
export interface GetFriendListResponse {
  items: UserInfo[];
  nextCursor: string | null;
  limit: number;
}

/** GET /friends/incoming response */
export interface GetIncomingFriendRequestsResponse {
  items: FriendRequest[];
  nextCursor: string | null;
  limit: number;
}

/** GET /friends/outgoing response */
export interface GetOutgoingFriendRequestsResponse {
  items: FriendRequest[];
  nextCursor: string | null;
  limit: number;
}

/** GET /friends/suggestions response */
export interface GetFriendSuggestionsResponse {
  items: UserInfo[];
  nextCursor: string | null;
  limit: number;
}

/** POST /friends/request body */
export interface SendFriendRequestPayload {
  toUserId: string;
}

/** POST /friends/request/:id/accept body */
export interface AcceptFriendRequestPayload {
  // No body needed, use path param
}

/** POST /friends/request/:id/reject body */
export interface RejectFriendRequestPayload {
  // No body needed, use path param
}

/** POST /friends/:id/remove body */
export interface RemoveFriendPayload {
  // No body needed, use path param
}

/** Socket events for friend actions */
export interface FriendSocketEvents {
  'friend_request_received': {
    request: FriendRequest;
  };
  'friend_request_accepted': {
    friendId: string;
    user: UserInfo;
  };
  'friend_request_rejected': {
    requestId: string;
  };
  'friend_removed': {
    friendId: string;
  };
}

/** Friend action result */
export interface FriendActionResult {
  success: boolean;
  request?: FriendRequest;
  message: string;
}

/** Blocking user types */
export interface BlockedUserInfo extends UserInfo {
  blockedAt?: string;
}

/** POST /users/:id/block body */
export interface BlockUserPayload {
  // No body needed, use path param
}

/** POST /users/:id/unblock body */
export interface UnblockUserPayload {
  // No body needed, use path param
}

/** GET /users/:id/blocked response */
export interface GetBlockedUsersResponse {
  items: BlockedUserInfo[];
  nextCursor: string | null;
  limit: number;
}

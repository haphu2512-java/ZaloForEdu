// ============================================================
// Central Export File for All Types
// Use: import type { User, Message, Conversation } from '@/types'
// ============================================================

export type * from './auth';
export type * from './chat';
export type * from './notification';
export type * from './settings';
export type * from './search';
export type * from './friend';

// Re-export commonly used types for convenience
export type {
  // Auth
  User,
  ApiResponse,
  AuthData,
  AuthResponse,
  LoginPayload,
} from './auth';

export type {
  Conversation,
  Message,
  ConversationType,
  MessageStatus,
  UserInfo,
  SenderInfo,
} from './chat';

export type {
  FriendRequest,
  SendFriendRequestPayload,
} from './friend';

export type { Notification } from './notification';
export type { UserSettings } from './settings';
export type { SearchResult } from './search';

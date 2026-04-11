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
  // Chat
  Conversation,
  Message,
  ConversationType,
  MessageStatus,
  UserInfo,
  SenderInfo,
  // Friend
  FriendRequest,
  // Notification
  Notification,
  // Settings
  UserSettings,
  // Search
  SearchResult,
} from './index';

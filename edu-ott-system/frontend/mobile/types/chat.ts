// ============================================================
// Chat Types - Khớp 1:1 với Backend Models
// Conversation, Message, Friend
// ============================================================

/** Loại conversation */
export type ConversationType = 'direct' | 'group';

/** Trạng thái tin nhắn phía client */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

// --- Sub-types ---

/** User info khi được populate */
export interface UserInfo {
  id?: string;
  _id?: string;
  username: string;
  email?: string;
  phone?: string;
  avatarUrl?: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
}

/** Sender info khi populate senderId */
export interface SenderInfo {
  _id: string;
  username: string;
  avatarUrl?: string | null;
  fullName?: string;
  avatar?: string | null;
}

// --- Core Models ---

/** Backend Conversation model */
export interface Conversation {
  _id: string;
  id?: string;
  type: ConversationType;
  name?: string | null;
  avatarUrl?: string | null;
  participants: UserInfo[];
  createdBy: string;
  ownerId?: string | UserInfo;
  adminIds?: Array<string | UserInfo>;
  pinnedMessageId?: string | null;
  nicknames?: Record<string, string>;
  preference?: {
    category?: 'primary' | 'work' | 'family' | 'other';
    nickname?: string | null;
    isHidden?: boolean;
    isDeleted?: boolean;
  } | null;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  /** Injected by backend list endpoint */
  latestMessage?: Message | null;
}

export interface Reaction {
  userId: string;
  emoji: string;
}

/** Legacy attachment type used by old chat UI components */
export interface Attachment {
  _id: string;
  name: string;
  type: string;
  url: string;
  size: number;
}

/** Backend Message model */
export interface Message {
  _id: string;
  id?: string;
  conversationId: string | { _id: string };
  senderId: SenderInfo | string;
  /** Legacy sender field for older UI components */
  sender?: SenderInfo | { id?: string; _id?: string; username?: string; fullName?: string; avatar?: string };
  content: string;
  mediaIds: string[];
  /** Legacy attachment field for older UI components */
  attachments: Attachment[];
  /** Legacy message type */
  type?: 'text' | 'image' | 'file' | string;
  replyTo?: Message | string | null;
  forwardFrom?: Message | string | null;
  deliveredTo: string[];
  seenBy: string[];
  isRecalled?: boolean;
  /** Legacy delete/edit flags for older UI components */
  isDeleted?: boolean;
  isEdited?: boolean;
  readBy?: string[];
  deletedBy?: string[];
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;
  /** Client-only */
  status?: MessageStatus;
}

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

// --- API Payloads ---

/** POST /messages/send body */
export interface SendMessagePayload {
  conversationId: string;
  content?: string;
  mediaIds?: string[];
  replyTo?: string;
  forwardFrom?: string;
}

/** POST /conversations body */
export interface CreateConversationPayload {
  type: ConversationType;
  name?: string;
  participantIds: string[];
}

export interface TransferGroupOwnerPayload {
  newOwnerId: string;
}

/** POST /friends/request body */
export interface SendFriendRequestPayload {
  toUserId: string;
}

// --- API Responses ---

/** Cursor-based paginated response wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;  // Base64-encoded cursor for next page
  limit: number;
}

/** Cursor-based pagination for messages */
export interface CursorPaginatedMessages {
  items: Message[];
  nextCursor: string | null;
  limit: number;
}

/** GET /messages/conversation/:id params */
export interface GetMessagesParams {
  conversationId: string;
  limit?: number;
  cursor?: string;
}

/** Conversation list item for display */
export interface ConversationListItem extends Conversation {
  /** Computed display name for the conversation */
  displayName?: string;
  /** Computed avatar */
  displayAvatar?: string | null;
}

export interface NotificationItem {
  _id: string;
  id?: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaItem {
  _id: string;
  id?: string;
  uploaderId: string;
  fileName: string;
  mimeType: string;
  size: number;
  storage: 'local' | 'cloudinary';
  url: string;
  providerPublicId?: string | null;
  providerResourceType?: string | null;
  createdAt: string;
  updatedAt: string;
}

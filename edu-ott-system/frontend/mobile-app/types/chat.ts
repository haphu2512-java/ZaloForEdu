// ============================================================
// Chat Types - Khớp 1:1 với Backend API Message Schema
// ============================================================

/** Loại tin nhắn được backend hỗ trợ */
export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio' | 'system';

/** Loại phòng chat */
export type RoomModel = 'Class' | 'Group' | 'Conversation';

/** Trạng thái tin nhắn phía client */
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

/** Vai trò người dùng */
export type UserRole = 'student' | 'teacher' | 'admin';

// --- Sub-types ---

export interface Attachment {
  name: string;
  url: string;
  type: string; // mime type, e.g. 'image/png'
  size: number; // bytes
}

export interface ReadReceipt {
  user: string; // userId
  readAt: string; // ISO date-time
}

export interface Reaction {
  user: string; // userId
  emoji: string; // e.g. '👍'
}

export interface UserInfo {
  _id: string;
  fullName: string;
  avatar?: string;
  email?: string;
}

// --- Core Types ---

/** Schema Message khớp với backend /messages API */
export interface Message {
  _id: string;
  content: string;
  type: MessageType;
  sender: UserInfo;
  room: string;
  roomModel: RoomModel;
  attachments: Attachment[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  replyTo?: Message | string; // populated or just ID
  readBy: ReadReceipt[];
  reactions: Reaction[];
  createdAt: string;
  updatedAt: string;

  // Client-only fields
  status?: MessageStatus;
}

/** Request body để gửi tin nhắn - POST /messages */
export interface SendMessagePayload {
  content?: string;
  type?: MessageType;
  roomId: string;
  roomModel: RoomModel;
  attachments?: Attachment[];
  replyTo?: string; // message ID
}

/** Request body để sửa tin nhắn - PUT /messages/:id */
export interface UpdateMessagePayload {
  content: string;
}

/** Request body để thêm reaction - POST /messages/:id/reaction */
export interface AddReactionPayload {
  emoji: string;
}

/** Params cho GET /messages */
export interface GetMessagesParams {
  roomId: string;
  roomModel: RoomModel;
  page?: number;
  limit?: number;
  before?: string; // ISO date-time, cho infinite scroll
}

/** Response từ GET /messages */
export interface GetMessagesResponse {
  status: string;
  results: number;
  total: number;
  data: {
    messages: Message[];
  };
}

/** Thông tin phòng chat để hiển thị trên ChatListItem */
export interface ChatRoom {
  id: string;
  name: string;
  avatar?: string;
  roomModel: RoomModel;
  lastMessage?: {
    content: string;
    sender: string;
    createdAt: string;
    type: MessageType;
  };
  unreadCount: number;
  members?: UserInfo[];
}

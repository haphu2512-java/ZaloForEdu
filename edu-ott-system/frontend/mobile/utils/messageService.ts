import { fetchAPI } from './api';
import type {
  Message,
  SendMessagePayload,
  CursorPaginatedMessages,
  GetMessagesParams,
  Conversation,
  CreateConversationPayload,
  PaginatedResponse,
  TransferGroupOwnerPayload,
} from '../types/chat';

// ============================================================
// Message & Conversation Service
// Backend endpoints: /api/v1/messages/* and /api/v1/conversations/*
// ============================================================

const MESSAGES_ENDPOINT = '/messages';
const CONVERSATIONS_ENDPOINT = '/conversations';

function normalizeConversation(conversation: Conversation): Conversation {
  return {
    ...conversation,
    _id: conversation._id || conversation.id || '',
    id: conversation.id || conversation._id || '',
  };
}

function normalizeMessage(message: Message): Message {
  return {
    ...message,
    _id: message._id || message.id || '',
    id: message.id || message._id || '',
  };
}

// ==================== CONVERSATIONS ====================

/**
 * Lấy danh sách conversations của user hiện tại
 * GET /conversations?limit=&cursor=
 */
export async function getConversations(
  cursor: string | null = null,
  limit: number = 20,
): Promise<PaginatedResponse<Conversation>> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(
    `${CONVERSATIONS_ENDPOINT}?${params.toString()}`,
  );
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeConversation),
  };
}

/**
 * Lấy danh sách tin nhắn đã lưu trữ / ẩn
 * GET /conversations/archived
 */
export async function getArchivedConversations(): Promise<PaginatedResponse<Conversation>> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/archived`);
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeConversation),
  };
}

/**
 * Tạo conversation mới (direct hoặc group)
 * POST /conversations { type, name?, participantIds }
 */
export async function createConversation(
  payload: CreateConversationPayload,
): Promise<Conversation> {
  const res = await fetchAPI(CONVERSATIONS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeConversation(res.data);
}

export async function updateGroupName(conversationId: string, name: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/name`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  });
  return normalizeConversation(res.data);
}

export async function addGroupMembers(conversationId: string, memberIds: string[]): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/members`, {
    method: 'POST',
    body: JSON.stringify({ memberIds }),
  });
  return normalizeConversation(res.data);
}

export async function removeGroupMember(conversationId: string, memberId: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/members/${memberId}`, {
    method: 'DELETE',
  });
  return normalizeConversation(res.data);
}

export async function promoteGroupAdmin(conversationId: string, memberId: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/admins/${memberId}/promote`, {
    method: 'PUT',
  });
  return normalizeConversation(res.data);
}

export async function demoteGroupAdmin(conversationId: string, memberId: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/admins/${memberId}/demote`, {
    method: 'PUT',
  });
  return normalizeConversation(res.data);
}

export async function transferGroupOwner(
  conversationId: string,
  payload: TransferGroupOwnerPayload,
): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/owner`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return normalizeConversation(res.data);
}

export async function leaveGroup(conversationId: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/leave`, {
    method: 'POST',
  });
  return normalizeConversation(res.data);
}

export async function updateGroupAvatar(conversationId: string, avatarUrl: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/avatar`, {
    method: 'PUT',
    body: JSON.stringify({ avatarUrl }),
  });
  return normalizeConversation(res.data);
}

export async function updateGroupNickname(
  conversationId: string,
  memberId: string,
  nickname: string,
): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/nicknames/${memberId}`, {
    method: 'PUT',
    body: JSON.stringify({ nickname }),
  });
  return normalizeConversation(res.data);
}

export async function pinGroupMessage(conversationId: string, messageId: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/pin`, {
    method: 'PUT',
    body: JSON.stringify({ messageId }),
  });
  return normalizeConversation(res.data);
}

export async function unpinGroupMessage(conversationId: string): Promise<Conversation> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/pin`, {
    method: 'DELETE',
  });
  return normalizeConversation(res.data);
}

export async function updateConversationPreference(
  conversationId: string,
  payload: {
    category?: 'primary' | 'work' | 'family' | 'other';
    nickname?: string | null;
    isHidden?: boolean;
    isDeleted?: boolean;
  },
): Promise<any> {
  const res = await fetchAPI(`${CONVERSATIONS_ENDPOINT}/${conversationId}/preferences`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

// ==================== MESSAGES ====================

/**
 * Lấy danh sách tin nhắn theo conversation (cursor-based pagination)
 * GET /messages/conversation/:id?limit=&cursor=
 */
export async function getMessages(
  params: GetMessagesParams,
): Promise<CursorPaginatedMessages> {
  const searchParams = new URLSearchParams();
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.cursor) searchParams.set('cursor', params.cursor);

  const queryStr = searchParams.toString();
  const res = await fetchAPI(
    `${MESSAGES_ENDPOINT}/conversation/${params.conversationId}${queryStr ? '?' + queryStr : ''}`,
  );
  return {
    ...res.data,
    items: (res.data?.items || []).map(normalizeMessage),
  };
}

/**
 * Gửi tin nhắn mới
 * POST /messages/send { conversationId, content?, mediaIds?, replyTo?, forwardFrom? }
 */
export async function sendMessage(
  payload: SendMessagePayload,
): Promise<Message> {
  const res = await fetchAPI(`${MESSAGES_ENDPOINT}/send`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeMessage(res.data);
}

/**
 * Đánh dấu tin nhắn đã đọc
 * PUT /messages/:id/read
 */
export async function markMessageRead(messageId: string): Promise<void> {
  await fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}/read`, {
    method: 'PUT',
  });
}

/**
 * Xóa tin nhắn (Delete for me - xóa ẩn phía tôi)
 * DELETE /messages/:id
 */
export async function deleteMessage(messageId: string): Promise<void> {
  await fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Thu hồi tin nhắn (Recall/Unsend - thu hồi với mọi người)
 * PUT /messages/:id/recall
 */
export async function recallMessage(messageId: string): Promise<Message> {
  const res = await fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}/recall`, {
    method: 'PUT',
  });
  return normalizeMessage(res.data);
}

/**
 * Thả cảm xúc tin nhắn (React)
 * PUT /messages/:id/react { emoji?: string }
 */
export async function reactToMessage(messageId: string, emoji?: string): Promise<any> {
  const res = await fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}/react`, {
    method: 'PUT',
    body: JSON.stringify({ emoji }),
  });
  return res.data;
}

/**
 * Tải file/media
 * POST /media/upload { fileName, mimeType, contentBase64 }
 */
export async function uploadMedia(payload: { fileName: string; mimeType: string; contentBase64: string }): Promise<any> {
  const res = await fetchAPI('/media/upload', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

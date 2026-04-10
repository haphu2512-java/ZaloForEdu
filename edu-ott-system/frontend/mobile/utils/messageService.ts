import { fetchAPI } from './api';
import type {
  Message,
  SendMessagePayload,
  CursorPaginatedMessages,
  GetMessagesParams,
  Conversation,
  CreateConversationPayload,
  PaginatedResponse,
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
 * GET /conversations?page=&limit=
 */
export async function getConversations(
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<Conversation>> {
  const res = await fetchAPI(
    `${CONVERSATIONS_ENDPOINT}?page=${page}&limit=${limit}`,
  );
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

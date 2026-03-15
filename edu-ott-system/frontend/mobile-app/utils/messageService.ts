import { fetchAPI } from './api';
import type {
  GetMessagesParams,
  GetMessagesResponse,
  SendMessagePayload,
  UpdateMessagePayload,
  AddReactionPayload,
  Message,
} from '../types/chat';

// ============================================================
// Message Service - Tầng giao tiếp với Backend /messages API
// ============================================================

const MESSAGES_ENDPOINT = '/messages';

/**
 * Lấy danh sách tin nhắn theo phòng (hỗ trợ phân trang & infinite scroll)
 * GET /messages?roomId=...&roomModel=...&page=...&limit=...&before=...
 */
export async function getMessages(params: GetMessagesParams): Promise<GetMessagesResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('roomId', params.roomId);
  searchParams.set('roomModel', params.roomModel);

  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.before) searchParams.set('before', params.before);

  return fetchAPI(`${MESSAGES_ENDPOINT}?${searchParams.toString()}`);
}

/**
 * Gửi tin nhắn mới
 * POST /messages
 */
export async function sendMessage(payload: SendMessagePayload): Promise<{ status: string; data: { message: Message } }> {
  return fetchAPI(MESSAGES_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Sửa nội dung tin nhắn (chỉ sender mới được sửa)
 * PUT /messages/:id
 */
export async function updateMessage(messageId: string, payload: UpdateMessagePayload): Promise<{ status: string; data: { message: Message } }> {
  return fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Xóa tin nhắn (soft delete, chỉ sender hoặc admin)
 * DELETE /messages/:id
 */
export async function deleteMessage(messageId: string): Promise<{ status: string }> {
  return fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}`, {
    method: 'DELETE',
  });
}

/**
 * Đánh dấu tin nhắn đã đọc
 * POST /messages/:id/read
 */
export async function markAsRead(messageId: string): Promise<{ status: string }> {
  return fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}/read`, {
    method: 'POST',
  });
}

/**
 * Thêm hoặc thay đổi reaction emoji
 * POST /messages/:id/reaction
 */
export async function addReaction(messageId: string, payload: AddReactionPayload): Promise<{ status: string; data: { message: Message } }> {
  return fetchAPI(`${MESSAGES_ENDPOINT}/${messageId}/reaction`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

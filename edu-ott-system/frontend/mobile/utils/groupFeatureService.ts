/**
 * groupFeatureService.ts
 * Features 2, 4, 5: Bảng tin, Duyệt thành viên, Invite Link - API service cho Mobile
 */
import { fetchAPI } from './api';

// ==================== TYPES ====================

export interface PinnedItem {
  messageId: {
    _id: string;
    content: string;
    senderId: { _id: string; username: string; avatarUrl?: string };
    createdAt: string;
  };
  pinnedBy: { _id: string; username: string; avatarUrl?: string };
  pinnedAt: string;
}

export interface JoinRequest {
  _id: string;
  conversationId: string;
  userId: {
    _id: string;
    username: string;
    avatarUrl?: string;
    email?: string;
    phone?: string;
  };
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  processedBy?: string;
  processedAt?: string;
  createdAt: string;
}

export interface GroupPreview {
  _id: string;
  name: string;
  avatarUrl?: string;
  memberCount: number;
  isApprovalRequired: boolean;
}

export interface InviteLinkResponse {
  inviteCode: string;
  inviteLink: string;
}

// ==================== FEATURE 2: PINNED MESSAGES ====================

/** Ghim tin nhắn vào bảng tin nhóm */
export const pinMessage = async (conversationId: string, messageId: string): Promise<PinnedItem[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/pins`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });
  return res.data;
};

/** Bỏ ghim tin nhắn */
export const unpinMessage = async (conversationId: string, messageId: string): Promise<PinnedItem[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/pins/${messageId}`, {
    method: 'DELETE',
  });
  return res.data;
};

/** Lấy danh sách ghim (Bảng tin nhóm) */
export const getPinnedMessages = async (conversationId: string): Promise<PinnedItem[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/pins`);
  return res.data;
};

// ==================== FEATURE 4: JOIN APPROVAL ====================

/** Cập nhật cài đặt nhóm (bật/tắt duyệt thành viên) */
export const updateGroupSettings = async (
  conversationId: string,
  settings: { isApprovalRequired?: boolean },
): Promise<{ isApprovalRequired: boolean }> => {
  const res = await fetchAPI(`/conversations/${conversationId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return res.data;
};

/** Gửi yêu cầu tham gia nhóm */
export const requestToJoin = async (conversationId: string, reason?: string): Promise<JoinRequest> => {
  const res = await fetchAPI(`/conversations/${conversationId}/join-requests`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
};

/** Admin lấy danh sách yêu cầu tham gia */
export const listJoinRequests = async (
  conversationId: string,
  status: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<JoinRequest[]> => {
  const params = new URLSearchParams({ status });
  const res = await fetchAPI(`/conversations/${conversationId}/join-requests?${params.toString()}`);
  return res.data.items;
};

/** Admin duyệt / từ chối yêu cầu tham gia */
export const processJoinRequest = async (
  conversationId: string,
  requestId: string,
  action: 'approve' | 'reject',
): Promise<JoinRequest> => {
  const res = await fetchAPI(`/conversations/${conversationId}/join-requests/${requestId}`, {
    method: 'PUT',
    body: JSON.stringify({ action }),
  });
  return res.data;
};

// ==================== FEATURE 5: INVITE LINKS ====================

/** Lấy hoặc tạo invite link */
export const getInviteLink = async (conversationId: string): Promise<InviteLinkResponse> => {
  const res = await fetchAPI(`/conversations/${conversationId}/invite-link`);
  return res.data;
};

/** Reset invite link (vô hiệu hóa link cũ) */
export const resetInviteLink = async (inviteCode: string): Promise<InviteLinkResponse> => {
  const res = await fetchAPI(`/conversations/invite/${inviteCode}/reset`, {
    method: 'POST',
  });
  return res.data;
};

/** Xem preview nhóm từ invite code (trước khi join) */
export const previewGroupByCode = async (code: string): Promise<GroupPreview> => {
  const res = await fetchAPI(`/conversations/preview/${code}`);
  return res.data;
};

/** Tham gia nhóm qua invite link */
export const joinGroupByCode = async (code: string): Promise<{ requiresApproval?: boolean; joinRequest?: JoinRequest; conversation?: any }> => {
  const res = await fetchAPI(`/conversations/join/${code}`, {
    method: 'POST',
  });
  return res.data;
};

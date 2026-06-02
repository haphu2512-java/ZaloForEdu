import { API_BASE_URL, fetchAPI } from './api';

export interface PinnedItem {
  _id?: string;
  messageId: {
    _id: string;
    content: string;
    senderId: { _id: string; username: string; avatarUrl?: string };
    createdAt: string;
    type?: string;
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

export interface Reminder {
  _id: string;
  conversationId: string;
  title: string;
  remindAt: string;
  status?: 'upcoming' | 'done';
  participants?: Array<{ _id: string; username?: string; avatarUrl?: string } | string>;
  declinedBy?: Array<{ _id: string; username?: string; avatarUrl?: string } | string>;
  createdBy?: { _id: string; username?: string; avatarUrl?: string } | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GroupBlockedMember {
  _id?: string;
  id?: string;
  username?: string;
  avatarUrl?: string;
  email?: string;
  phone?: string;
}

export interface GroupSettingsPayload {
  canMembersUpdateInfo?: boolean;
  canMembersPin?: boolean;
  canMembersCreateReminders?: boolean;
  canMembersCreatePolls?: boolean;
  canMembersSendMessages?: boolean;
  isApprovalRequired?: boolean;
  markAdminMessages?: boolean;
  allowNewMembersReadHistory?: boolean;
  allowInviteLink?: boolean;
}

export const pinMessage = async (conversationId: string, messageId: string): Promise<PinnedItem[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/pins`, {
    method: 'POST',
    body: JSON.stringify({ messageId }),
  });
  return res.data;
};

export const unpinMessage = async (conversationId: string, messageId: string): Promise<PinnedItem[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/pins/${messageId}`, {
    method: 'DELETE',
  });
  return res.data;
};

export const getPinnedMessages = async (conversationId: string): Promise<PinnedItem[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/pins`);
  return res.data;
};

export const updateGroupSettings = async (
  conversationId: string,
  settings: GroupSettingsPayload,
): Promise<any> => {
  const res = await fetchAPI(`/conversations/${conversationId}/settings`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
  return res.data;
};

export const requestToJoin = async (conversationId: string, reason?: string): Promise<JoinRequest> => {
  const res = await fetchAPI(`/conversations/${conversationId}/join-requests`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  return res.data;
};

export const listJoinRequests = async (
  conversationId: string,
  status: 'pending' | 'approved' | 'rejected' = 'pending',
): Promise<JoinRequest[]> => {
  const params = new URLSearchParams({ status });
  const res = await fetchAPI(`/conversations/${conversationId}/join-requests?${params.toString()}`);
  return res.data.items;
};

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

export const getReminders = async (conversationId: string): Promise<Reminder[]> => {
  const res = await fetchAPI(`/reminders/conversation/${conversationId}`);
  return res.data || [];
};

export const createReminder = async (payload: {
  conversationId: string;
  title: string;
  remindAt: string;
}): Promise<Reminder> => {
  const res = await fetchAPI('/reminders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
};

export const updateReminder = async (
  reminderId: string,
  payload: { title?: string; remindAt?: string },
): Promise<Reminder> => {
  const res = await fetchAPI(`/reminders/${reminderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
};

export const deleteReminder = async (reminderId: string): Promise<Reminder> => {
  const res = await fetchAPI(`/reminders/${reminderId}`, {
    method: 'DELETE',
  });
  return res.data;
};

export const joinReminder = async (reminderId: string): Promise<Reminder> => {
  const res = await fetchAPI(`/reminders/${reminderId}/join`, {
    method: 'POST',
  });
  return res.data;
};

export const declineReminder = async (reminderId: string): Promise<Reminder> => {
  const res = await fetchAPI(`/reminders/${reminderId}/decline`, {
    method: 'POST',
  });
  return res.data;
};

export const blockMember = async (conversationId: string, memberId: string): Promise<any> => {
  const res = await fetchAPI(`/conversations/${conversationId}/block`, {
    method: 'POST',
    body: JSON.stringify({ memberId }),
  });
  return res.data;
};

export const unblockMember = async (conversationId: string, memberId: string): Promise<any> => {
  const res = await fetchAPI(`/conversations/${conversationId}/block/${memberId}`, {
    method: 'DELETE',
  });
  return res.data;
};

export const listBlockedMembers = async (conversationId: string): Promise<GroupBlockedMember[]> => {
  const res = await fetchAPI(`/conversations/${conversationId}/blocked`);
  return res.data || [];
};

export const getInviteLink = async (conversationId: string): Promise<InviteLinkResponse> => {
  const res = await fetchAPI(`/conversations/${conversationId}/invite-link`);
  return res.data;
};

export const resetInviteLink = async (inviteCode: string): Promise<InviteLinkResponse> => {
  const res = await fetchAPI(`/conversations/invite/${inviteCode}/reset`, {
    method: 'POST',
  });
  return res.data;
};

export const buildGroupWebInviteLink = (inviteCode: string): string => {
  const explicitWebOrigin = (process.env.EXPO_PUBLIC_WEB_URL || '').trim().replace(/\/+$/, '');
  const origin = explicitWebOrigin || 'http://localhost:3000';
  return `${origin}/join/${inviteCode}`;
};

export const buildGroupDeepInviteLink = (inviteCode: string, scheme = 'mobileapp'): string =>
  `${scheme}://join/${inviteCode}`;

export const previewGroupByCode = async (code: string): Promise<GroupPreview> => {
  const res = await fetchAPI(`/conversations/preview/${code}`);
  return res.data;
};

export const joinGroupByCode = async (
  code: string,
): Promise<{ requiresApproval?: boolean; joinRequest?: JoinRequest; conversation?: any }> => {
  const res = await fetchAPI(`/conversations/join/${code}`, {
    method: 'POST',
  });
  return res.data;
};


import api from "./authService";
import axios from "axios";

const API_URL = 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const conversationService = {
  // Archive / unarchive
  // getArchivedConversations: (cursor, limit = 20) => {
  //   const params = { limit };
  //   if (cursor) params.cursor = cursor;
  //   return api.get("/conversations/archived", { params });
  // },

  // archiveConversation: (conversationId) =>
  //   api.put(`/conversations/${conversationId}/preference`, { isArchived: true }),

  // unarchiveConversation: (conversationId) =>
  //   api.put(`/conversations/${conversationId}/preference`, { isArchived: false }),

  // deleteConversation: (conversationId) =>
  //   api.delete(`/conversations/${conversationId}`),

  // ==========================================
  // 1. QUẢN LÝ DANH SÁCH & TẠO HỘI THOẠI
  // ==========================================
  
  // Lấy danh sách bạn bè (dùng để chọn người khi tạo nhóm)
  getFriendList: async (limit = 100) => {
    const res = await axios.get(`${API_URL}/friends?limit=${limit}`, getAuthHeaders());
    return res.data;
  },

  // Lấy danh sách hội thoại (Group + Direct)
  getConversations: async (cursor, limit = 20) => {
    const params = new URLSearchParams({ limit });
    if (cursor) params.append('cursor', cursor);
    const res = await axios.get(`${API_URL}/conversations?${params.toString()}`, getAuthHeaders());
    return res.data;
  },
  // Lấy danh sách hội thoại bị ẩn/lưu trữ
  getArchivedConversations: async (cursor, limit = 20) => {
    const params = new URLSearchParams({ limit });
    if (cursor) params.append('cursor', cursor);
    const res = await axios.get(`${API_URL}/conversations/archived?${params.toString()}`, getAuthHeaders());
    return res.data;
  },

  // Tạo nhóm chat mới
  createGroupConversation: async (name, participantIds) => {
    const res = await axios.post(
      `${API_URL}/conversations`,
      { type: 'group', name, participantIds },
      getAuthHeaders()
    );
    return res.data;
  },

  // Cập nhật trạng thái ẩn/hiện của cuộc trò chuyện (Archive)
  updateConversationPreference: async (conversationId, isHidden) => {
    const res = await axios.put(
      `${API_URL}/conversations/${conversationId}/preferences`,
      { isHidden },
      getAuthHeaders()
    );
    return res.data;
  },

  archiveConversation: async (conversationId) => {
    return conversationService.updateConversationPreference(conversationId, true);
  },

  unarchiveConversation: async (conversationId) => {
    return conversationService.updateConversationPreference(conversationId, false);
  },

  // ==========================================
  // 2. TÍNH NĂNG NHÓM CƠ BẢN (Tên, Ảnh, Thành viên)
  // ==========================================

  updateGroupName: async (id, name) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/name`, { name }, getAuthHeaders());
    return res.data;
  },

  updateGroupAvatar: async (id, avatarUrl) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/avatar`, { avatarUrl }, getAuthHeaders());
    return res.data;
  },

  addGroupMembers: async (id, memberIds) => {
    const res = await axios.post(`${API_URL}/conversations/${id}/members`, { memberIds }, getAuthHeaders());
    return res.data;
  },

  removeGroupMember: async (id, memberId) => {
    const res = await axios.delete(`${API_URL}/conversations/${id}/members/${memberId}`, getAuthHeaders());
    return res.data;
  },

  leaveGroup: async (id) => {
    const res = await axios.post(`${API_URL}/conversations/${id}/leave`, {}, getAuthHeaders());
    return res.data;
  },

  disbandGroup: async (id) => {
    const res = await axios.delete(`${API_URL}/conversations/${id}/disband`, getAuthHeaders());
    return res.data;
  },

  promoteGroupAdmin: async (id, memberId) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/admins/${memberId}/promote`, {}, getAuthHeaders());
    return res.data;
  },

  demoteGroupAdmin: async (id, memberId) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/admins/${memberId}/demote`, {}, getAuthHeaders());
    return res.data;
  },

  transferGroupOwner: async (id, newOwnerId) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/owner`, { newOwnerId }, getAuthHeaders());
    return res.data;
  },

  // ==========================================
  // 3. TÍNH NĂNG BẢNG TIN (PIN MESSAGES)
  // ==========================================

  getPinnedMessages: async (id) => {
    const res = await axios.get(`${API_URL}/conversations/${id}/pins`, getAuthHeaders());
    return res.data;
  },

  pinMessage: async (id, messageId) => {
    const res = await axios.post(`${API_URL}/conversations/${id}/pins`, { messageId }, getAuthHeaders());
    return res.data;
  },

  unpinMessage: async (id, messageId) => {
    const res = await axios.delete(`${API_URL}/conversations/${id}/pins/${messageId}`, getAuthHeaders());
    return res.data;
  },

  // ==========================================
  // 4. TÍNH NĂNG DUYỆT THÀNH VIÊN
  // ==========================================

  updateGroupSettings: async (id, isApprovalRequired) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/settings`, { isApprovalRequired }, getAuthHeaders());
    return res.data;
  },

  requestToJoinGroup: async (id, reason = '') => {
    const res = await axios.post(`${API_URL}/conversations/${id}/join-requests`, { reason }, getAuthHeaders());
    return res.data;
  },

  listJoinRequests: async (id) => {
    const res = await axios.get(`${API_URL}/conversations/${id}/join-requests`, getAuthHeaders());
    return res.data;
  },

  processJoinRequest: async (id, requestId, action) => {
    // action: 'approve' hoặc 'reject'
    const res = await axios.put(`${API_URL}/conversations/${id}/join-requests/${requestId}`, { action }, getAuthHeaders());
    return res.data;
  },

  // ==========================================
  // 5. TÍNH NĂNG LINK MỜI (INVITE LINK)
  // ==========================================

  getInviteLink: async (id) => {
    const res = await axios.get(`${API_URL}/conversations/${id}/invite-link`, getAuthHeaders());
    return res.data;
  },

  resetInviteLink: async (code) => {
    const res = await axios.post(`${API_URL}/conversations/invite/${code}/reset`, {}, getAuthHeaders());
    return res.data;
  },

  previewGroupByInviteCode: async (code) => {
    const res = await axios.get(`${API_URL}/conversations/preview/${code}`, getAuthHeaders());
    return res.data;
  },

  joinGroupByInviteCode: async (code) => {
    const res = await axios.post(`${API_URL}/conversations/join/${code}`, {}, getAuthHeaders());
    return res.data;
  },
  leaveGroup: async (id) => axios.post(`${API_URL}/conversations/${id}/leave`, {}, getAuthHeaders()),
  updateGroupName: async (id, name) => axios.put(`${API_URL}/conversations/${id}/name`, { name }, getAuthHeaders()),

  // TẮT THÔNG BÁO (MUTE)
  muteConversation: async (id, mutedUntil) => {
    const res = await axios.put(`${API_URL}/conversations/${id}/preferences`, { mutedUntil }, getAuthHeaders());
    return res.data;
  },

  // NHẮC HẸN (REMINDERS)
  getReminders: async (conversationId) => {
    const res = await axios.get(`${API_URL}/reminders/conversation/${conversationId}`, getAuthHeaders());
    return res.data;
  },
  createReminder: async (data) => {
    const res = await axios.post(`${API_URL}/reminders`, data, getAuthHeaders());
    return res.data;
  },
  deleteReminder: async (id) => {
    const res = await axios.delete(`${API_URL}/reminders/${id}`, getAuthHeaders());
    return res.data;
  },
};

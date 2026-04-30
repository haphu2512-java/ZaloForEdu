import api from "./authService";

export const friendService = {
  // Gửi yêu cầu kết bạn
  sendFriendRequest: async (toUserId, message = "Xin chào, mình muốn kết bạn!") => {
    const response = await api.post("/friends/request", { toUserId, message });
    return response.data.data;
  },

  // Chấp nhận yêu cầu kết bạn
  acceptRequest: async (requestId) => {
    const response = await api.put(`/friends/request/${requestId}/accept`);
    return response.data.data;
  },

  // Từ chối yêu cầu
  rejectRequest: async (requestId) => {
    const response = await api.put(`/friends/request/${requestId}/reject`);
    return response.data.data;
  },

  // Lấy danh sách yêu cầu kết bạn ĐẾN
  getIncomingRequests: async (page = 1, limit = 20) => {
    const response = await api.get(`/friends/request/incoming`, {
      params: { page, limit, _t: Date.now() },
    });
    return response.data.data;
  },

  // Lấy danh sách yêu cầu kết bạn ĐI (Pending)
  getOutgoingRequests: async (page = 1, limit = 20) => {
    const response = await api.get(`/friends/request/outgoing`, {
      params: { page, limit, _t: Date.now() },
    });
    return response.data.data;
  },

  // Hủy lời mời kết bạn đã gửi
  cancelFriendRequest: async (requestId) => {
    const response = await api.delete(`/friends/request/${requestId}/cancel`);
    return response.data.data;
  },

  // Xóa bạn bè
  removeFriend: async (friendId) => {
    const response = await api.delete(`/friends/${friendId}`);
    return response.data.data;
  },

  // Lấy danh sách bạn bè
  getFriendList: async (page = 1, limit = 20) => {
    const response = await api.get(`/friends/list`, {
      params: { page, limit, _t: Date.now() },
    });
    return response.data.data;
  },

  // Tìm kiếm người dùng (để kết bạn)
  searchUsers: async (q, page = 1, limit = 20) => {
    const response = await api.get(`/search/users`, {
      params: { q, page, limit },
    });
    return response.data.data;
  },
};

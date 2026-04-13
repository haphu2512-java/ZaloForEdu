import { create } from "zustand";
import { friendService } from "../services/friendService";

export const useFriendStore = create((set, get) => ({
  friends: [],
  incomingRequests: [],
  outgoingRequests: [],
  searchResults: [],
  isLoading: false,
  error: null,

  fetchFriends: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const data = await friendService.getFriendList(page);
      set({ friends: data.items || data.friends || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || "Lỗi tải bạn bè", isLoading: false });
    }
  },

  fetchIncomingRequests: async (page = 1) => {
    set({ isLoading: true, error: null });
    try {
      const data = await friendService.getIncomingRequests(page);
      set({ incomingRequests: data.items || data.requests || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || "Lỗi tải lời mời", isLoading: false });
    }
  },

  fetchOutgoingRequests: async (page = 1) => {
    try {
      const data = await friendService.getOutgoingRequests(page);
      set({ outgoingRequests: data.items || data.requests || [] });
    } catch (err) {
      console.log("Failed to fetch outgoing requests", err);
    }
  },

  searchUsersToFriend: async (q) => {
    if (!q || q.length < 3) {
      set({ searchResults: [] });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await friendService.searchUsers(q);
      set({ searchResults: data.users || [], isLoading: false });
    } catch (err) {
      set({ error: err.response?.data?.message || "Lỗi tìm kiếm", isLoading: false });
    }
  },

  clearSearchResults: () => set({ searchResults: [] }),

  sendRequest: async (receiverId) => {
    set({ isLoading: true, error: null });
    try {
      await friendService.sendFriendRequest(receiverId);
      // Refresh danh sách yêu cầu đã gửi để UI cập nhật trạng thái "Đã gửi"
      await get().fetchOutgoingRequests();
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.message || "Gửi lời mời thất bại" };
    }
  },

  acceptRequest: async (requestId) => {
    set({ isLoading: true, error: null });
    try {
      await friendService.acceptRequest(requestId);
      // Reload danh sách lời mời & danh sách bạn bè sau khi chấp nhận
      await Promise.all([get().fetchIncomingRequests(), get().fetchFriends()]);
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.message || "Chấp nhận thất bại" };
    }
  },

  rejectRequest: async (requestId) => {
    set({ isLoading: true, error: null });
    try {
      await friendService.rejectRequest(requestId);
      await get().fetchIncomingRequests();
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.message || "Từ chối thất bại" };
    }
  },

  unfriend: async (friendId) => {
    set({ isLoading: true, error: null });
    try {
      await friendService.removeFriend(friendId);
      // Cập nhật lại list friends cục bộ
      const currentFriends = get().friends;
      set({ 
        friends: currentFriends.filter(f => (f._id || f.id) !== friendId),
        isLoading: false 
      });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.message || "Hủy kết bạn thất bại" };
    }
  },

  blockFriend: async (targetId) => {
    set({ isLoading: true, error: null });
    const { authService } = await import("../services/authService");
    try {
      await authService.blockOrUnblockUser(targetId, "block");
      // Sau khi chặn, xóa luôn khỏi danh sách bạn bè
      const currentFriends = get().friends;
      set({ 
        friends: currentFriends.filter(f => (f._id || f.id) !== targetId),
        isLoading: false 
      });
      return { success: true };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.message || "Chặn người dùng thất bại" };
    }
  },
}));

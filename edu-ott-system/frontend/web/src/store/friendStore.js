import { create } from "zustand";
import { persist } from "zustand/middleware";
import { friendService } from "../services/friendService";

export const useFriendStore = create(
  persist(
    (set, get) => {
      console.log('🔵 [friendStore] Creating store...');
      
      return {
      friends: [],
      incomingRequests: [],
      outgoingRequests: [],
      searchResults: [],
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setHasHydrated: (state) => {
        console.log('🔄 [friendStore] setHasHydrated:', state);
        set({ _hasHydrated: state });
      },

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

  fetchOutgoingRequests: async (page = 1, skipIfHasData = false) => {
    console.log('🔵 [fetchOutgoingRequests] START - page:', page, 'skipIfHasData:', skipIfHasData);
    console.log('🔵 [fetchOutgoingRequests] Current outgoingRequests:', get().outgoingRequests);
    
    // Nếu đã có data và skipIfHasData = true, không fetch
    if (skipIfHasData && get().outgoingRequests.length > 0) {
      console.log('⏭️  [fetchOutgoingRequests] SKIPPED - already has data');
      return;
    }
    
    try {
      const data = await friendService.getOutgoingRequests(page);
      const newRequests = data.items || data.requests || [];
      console.log('✅ [fetchOutgoingRequests] API SUCCESS - received:', newRequests);
      
      set({ outgoingRequests: newRequests });
      console.log('🟢 [fetchOutgoingRequests] State updated');
      
      setTimeout(() => {
        const stored = localStorage.getItem('friend-storage');
        console.log('💾 [fetchOutgoingRequests] localStorage after 100ms:', stored ? JSON.parse(stored) : 'empty');
      }, 100);
    } catch (err) {
      console.error('❌ [fetchOutgoingRequests] ERROR:', err);
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
    console.log('🔵 [sendRequest] START - receiverId:', receiverId);
    console.log('🔵 [sendRequest] Current outgoingRequests:', get().outgoingRequests);
    
    set({ isLoading: true, error: null });
    try {
      const result = await friendService.sendFriendRequest(receiverId);
      console.log('✅ [sendRequest] API SUCCESS - result:', result);
      
      // Optimistic update: thêm request vào store ngay lập tức
      const newRequest = result || { 
        _id: `temp_${Date.now()}`, 
        toUserId: { _id: receiverId },
        fromUserId: get().friends[0]?._id, // placeholder
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      const updatedRequests = [...get().outgoingRequests, newRequest];
      console.log('🟢 [sendRequest] OPTIMISTIC UPDATE - new outgoingRequests:', updatedRequests);
      
      set({ 
        outgoingRequests: updatedRequests,
        isLoading: false 
      });
      
      console.log('🟢 [sendRequest] State updated, checking localStorage...');
      setTimeout(() => {
        const stored = localStorage.getItem('friend-storage');
        console.log('💾 [sendRequest] localStorage after 100ms:', stored ? JSON.parse(stored) : 'empty');
      }, 100);
      
      // Fetch sau 500ms để sync với server
      setTimeout(() => {
        console.log('🔄 [sendRequest] Fetching from server after 500ms...');
        get().fetchOutgoingRequests();
      }, 500);
      
      return { success: true };
    } catch (err) {
      console.error('❌ [sendRequest] ERROR:', err.response?.data || err.message);
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
    }; // end of return object
    },
    {
      name: "friend-storage",
      partialize: (state) => {
        console.log('💾 [persist.partialize] Saving to localStorage:', {
          friends: state.friends.length,
          incomingRequests: state.incomingRequests.length,
          outgoingRequests: state.outgoingRequests.length,
        });
        return {
          friends: state.friends,
          incomingRequests: state.incomingRequests,
          outgoingRequests: state.outgoingRequests,
        };
      },
      onRehydrateStorage: () => (state) => {
        console.log('🔄 [persist.onRehydrateStorage] Restored from localStorage:', {
          friends: state?.friends?.length || 0,
          incomingRequests: state?.incomingRequests?.length || 0,
          outgoingRequests: state?.outgoingRequests?.length || 0,
        });
        state?.setHasHydrated(true);
      },
    }
  )
);

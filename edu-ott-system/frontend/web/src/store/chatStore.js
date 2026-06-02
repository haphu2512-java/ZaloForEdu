import { create } from "zustand";
import { chatService } from "../services/chatService";

export const useChatStore = create((set, get) => ({
  conversations: [],
  hasMoreConversations: false,
  nextConversationCursor: null,
  isFetchingConversations: false,

  activeRoom: null,

  messages: {}, // Record<conversationId, Array<Message>>
  hasMoreMessages: {}, // Record<conversationId, boolean>
  nextMessageCursors: {}, // Record<conversationId, string>
  isFetchingMessages: false,

  // UI state
  messagesEndRef: null,

  // Global socket actions
  setConversations: (conversations) => set({ conversations }),
  
  setActiveRoom: (room) => {
    set({ activeRoom: room });
    // When activating a room, if we don't have messages fetched, fetch them
    if (room && !get().messages[room._id]) {
      if (room._id === 'mock-cloud-id') return;
      get().fetchMessages(room._id);
    }
  },

  // HTTP Actions
  fetchConversations: async (refresh = false) => {
    const { isFetchingConversations, nextConversationCursor } = get();
    if (isFetchingConversations) return;
    
    // Prevent fetching if no more items unless refreshing
    if (!refresh && !nextConversationCursor && get().conversations.length > 0) return;

    set({ isFetchingConversations: true });
    try {
      const cursor = refresh ? null : nextConversationCursor;
      const res = await chatService.getConversations(cursor);
      
      if (res.data?.success) {
        const { items, nextCursor } = res.data.data;
        set((state) => ({
          conversations: refresh ? items : [...state.conversations, ...items],
          nextConversationCursor: nextCursor,
          hasMoreConversations: !!nextCursor,
        }));
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    } finally {
      set({ isFetchingConversations: false });
    }
  },

  fetchMessages: async (conversationId, refresh = false) => {
    const { isFetchingMessages, nextMessageCursors, hasMoreMessages } = get();
    if (isFetchingMessages) return;

    const cursor = refresh ? null : nextMessageCursors[conversationId];
    
    // Don't fetch if no more messages
    if (!refresh && hasMoreMessages[conversationId] === false) return;

    set({ isFetchingMessages: true });
    try {
      const res = await chatService.getMessages(conversationId, cursor);
      if (res.data?.success) {
        const { items, nextCursor } = res.data.data;
        // The API returns latest messages first (descending). Let's keep them sorted if we render from bottom up, 
        // usually we reverse them for UI display. We will store them exactly as returned and reverse in component.
        
        set((state) => {
          const existing = refresh ? [] : state.messages[conversationId] || [];
          return {
            messages: {
              ...state.messages,
              [conversationId]: [...existing, ...items],
            },
            nextMessageCursors: {
              ...state.nextMessageCursors,
              [conversationId]: nextCursor,
            },
            hasMoreMessages: {
              ...state.hasMoreMessages,
              [conversationId]: !!nextCursor,
            },
          };
        });
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    } finally {
      set({ isFetchingMessages: false });
    }
  },

  sendMessage: async (conversationId, content, mediaIds = []) => {
    try {
      const payload = { conversationId, content, mediaIds };
      const res = await chatService.sendMessage(payload);
      if (res.data?.success) {
        // Socket 'new_message' will handle updating the UI
        return true;
      }
      return false;
    } catch (err) {
      console.error("Send message error:", err);
      return false;
    }
  },

  // Socket event handers
  handleSocketNewMessage: (msg) => {
    set((state) => {
      const cid = msg.conversationId;
      // Prepend to messages array because our UI uses descending or reversed state
      const existing = state.messages[cid] || [];
      
      // Update the conversations latest message
      const updatedConversations = state.conversations.map(c => {
        if (c._id === cid) {
          return { ...c, latestMessage: msg, lastMessageAt: msg.createdAt };
        }
        return c;
      });

      // Sort conversations so the one with new message bubbles to top
      updatedConversations.sort((a,b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

      return {
        messages: {
          ...state.messages,
          [cid]: [msg, ...existing],
        },
        conversations: updatedConversations
      };
    });
  },

  handleSocketMessageSeen: ({ messageId, userId, conversationId }) => {
    // update seen status
  },

  handleSocketTyping: ({ conversationId, userId }) => {
    // maybe handle typing state
  },

  handleGroupUpdated: ({ conversationId, ownerId, adminIds, action }) => {
    set((state) => {
      const updatedConversations = state.conversations.map(c => {
        if (c._id === conversationId) {
          return { 
            ...c, 
            ownerId: ownerId || c.ownerId,
            adminIds: adminIds || c.adminIds
          };
        }
        return c;
      });

      // Also update activeRoom if it's the same conversation
      const updatedActiveRoom = state.activeRoom?._id === conversationId
        ? { 
            ...state.activeRoom, 
            ownerId: ownerId || state.activeRoom.ownerId,
            adminIds: adminIds || state.activeRoom.adminIds
          }
        : state.activeRoom;

      return {
        conversations: updatedConversations,
        activeRoom: updatedActiveRoom
      };
    });
  }

}));

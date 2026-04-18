import api from "./authService";

export const chatService = {
  // --- Conversations ---
  getConversations: (cursor, limit = 20) => {
    // cursor format handled by backend, frontend passes string if available
    const params = { limit };
    if (cursor) params.cursor = cursor;
    return api.get("/conversations", { params });
  },

  createConversation: (data) => api.post("/conversations", data),

  // --- Messages ---
  getMessages: (conversationId, cursor, limit = 30) => {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    return api.get(`/messages/conversation/${conversationId}`, { params });
  },

  sendMessage: (data) => api.post("/messages/send", data),

  markMessageRead: (messageId) => api.put(`/messages/${messageId}/read`),

  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),

  recallMessage: (messageId) => api.put(`/messages/${messageId}/recall`),

  reactToMessage: (messageId, emoji) => api.put(`/messages/${messageId}/react`, { emoji }),

  // --- Search ---
  searchMessages: (conversationId, query, limit = 20) =>
    api.get('/search/messages', { params: { conversationId, q: query, limit } }),

  // --- Pins ---
  pinMessage: (conversationId, messageId) =>
    api.post(`/conversations/${conversationId}/pins`, { messageId }),

  unpinMessage: (conversationId, messageId) =>
    api.delete(`/conversations/${conversationId}/pins/${messageId}`),

  getPinnedMessages: (conversationId) =>
    api.get(`/conversations/${conversationId}/pins`),
};

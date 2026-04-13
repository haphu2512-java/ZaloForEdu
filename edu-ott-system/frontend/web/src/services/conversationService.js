import api from "./authService";

export const conversationService = {
  // Archive / unarchive
  getArchivedConversations: (cursor, limit = 20) => {
    const params = { limit };
    if (cursor) params.cursor = cursor;
    return api.get("/conversations/archived", { params });
  },

  archiveConversation: (conversationId) =>
    api.put(`/conversations/${conversationId}/preference`, { isArchived: true }),

  unarchiveConversation: (conversationId) =>
    api.put(`/conversations/${conversationId}/preference`, { isArchived: false }),

  deleteConversation: (conversationId) =>
    api.delete(`/conversations/${conversationId}`),
};

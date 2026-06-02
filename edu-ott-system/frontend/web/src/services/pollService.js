import api from "./authService";

export const pollService = {
  createPoll: async (data) => {
    const res = await api.post(`/polls`, data);
    return res.data;
  },

  getPolls: async (conversationId, limit = 20) => {
    const res = await api.get(`/polls?conversationId=${conversationId}&limit=${limit}`);
    return res.data;
  },

  getPollDetails: async (id) => {
    const res = await api.get(`/polls/${id}`);
    return res.data;
  },

  votePoll: async (id, optionIndexes) => {
    const res = await api.post(`/polls/${id}/vote`, { optionIndexes });
    return res.data;
  },

  closePoll: async (id) => {
    const res = await api.put(`/polls/${id}/close`);
    return res.data;
  }
};

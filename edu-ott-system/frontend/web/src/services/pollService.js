import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

export const pollService = {
  createPoll: async (data) => {
    const res = await axios.post(`${API_URL}/polls`, data, getAuthHeaders());
    return res.data;
  },

  getPolls: async (conversationId, limit = 20) => {
    const res = await axios.get(`${API_URL}/polls?conversationId=${conversationId}&limit=${limit}`, getAuthHeaders());
    return res.data;
  },

  getPollDetails: async (id) => {
    const res = await axios.get(`${API_URL}/polls/${id}`, getAuthHeaders());
    return res.data;
  },

  votePoll: async (id, optionIndexes) => {
    const res = await axios.post(`${API_URL}/polls/${id}/vote`, { optionIndexes }, getAuthHeaders());
    return res.data;
  },

  closePoll: async (id) => {
    const res = await axios.put(`${API_URL}/polls/${id}/close`, {}, getAuthHeaders());
    return res.data;
  }
};

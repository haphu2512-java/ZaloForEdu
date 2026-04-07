import api from "./authService";

export const classService = {
  getAll: (params) => api.get("/classes", { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post("/classes", data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  joinByCode: (code) => api.post('/classes/join-by-code', { code }),
  leave: (id) => api.post(`/classes/${id}/leave`),
  getMembers: (id) => api.get(`/classes/${id}/members`),
};

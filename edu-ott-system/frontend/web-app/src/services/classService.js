import api from "./authService";

export const classService = {
  getAll: (params) => api.get("/classes", { params }),
  getById: (id) => api.get(`/classes/${id}`),
  create: (data) => api.post("/classes", data),
  update: (id, data) => api.put(`/classes/${id}`, data),
  delete: (id) => api.delete(`/classes/${id}`),
  join: (id, enrollmentCode) =>
    api.post(`/classes/${id}/join`, { enrollmentCode }),
  leave: (id) => api.post(`/classes/${id}/leave`),
  getMembers: (id) => api.get(`/classes/${id}/members`),
};

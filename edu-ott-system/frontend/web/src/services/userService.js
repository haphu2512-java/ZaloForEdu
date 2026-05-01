import api from "./authService";
import { uploadFile } from "./mediaService";

export const userService = {
  // ── LẤY PROFILE ──
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  // ── UPDATE TEXT PROFILE ──
  updateProfile: async (userId, data) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },

  // ── UPLOAD ẢNH (dùng upload-form giống gửi ảnh trong tin nhắn, không dùng Cloudinary) ──
  uploadAvatar: async (file, onProgress) => {
    // Dùng đúng hàm uploadFile từ mediaService — POST /media/upload-form
    const media = await uploadFile(file, { onProgress });
    return { url: media.url };
  },

  // ── CÁC API ADMIN  ──
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  searchUsers: async (queryParams) => {
    const response = await api.get('/users/search', { params: queryParams });
    return response.data;
  },
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  updateUserStatus: async (data) => {
    // data phải có dạng: { targetUserId, isActive, banReason }
    const response = await api.post('/users/admin/status', data);
    return response.data;
  },
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  reportUser: async (id, reason) => {
    const response = await api.post(`/users/report/${id}`, { reason });
    return response.data;
  },
};
import api from "./authService";
import { getUploadSignature, uploadToCloudinary, registerMedia } from "./mediaService";

export const userService = {
  // ── LẤY PROFILE ──
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  getMyCloudStorage: async () => {
    const response = await api.get('/users/me/storage');
    return response.data;
  },

  // ── UPDATE TEXT PROFILE ──
  updateProfile: async (userId, data) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
  },

  // ── UPLOAD ẢNH (Dùng Cloudinary cho avatar, không dùng folder uploads local) ──
  uploadAvatar: async (file, onProgress) => {
    onProgress?.(10);
    const signatureData = await getUploadSignature({ resourceType: "image", folder: "avatars" });
    
    onProgress?.(40);
    const { secureUrl, publicId } = await uploadToCloudinary(file, signatureData, (pct) => {
      onProgress?.(40 + Math.round(pct * 0.4));
    });
    
    onProgress?.(90);
    await registerMedia({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      url: secureUrl,
      publicId,
      resourceType: "image",
    });
    
    onProgress?.(100);
    return { url: secureUrl };
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
import api from "./authService"; 

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

  // ── UPLOAD ẢNH CLOUDINARY CHUẨN 100% ──
  uploadAvatar: async (file) => {
    // Bước 1: Gọi ĐÚNG đường dẫn xin chữ ký trong media.routes.js
    const sigResponse = await api.post('/media/cloudinary/signature', {
      folder: 'edu-ott/profile-avatars',
      resourceType: 'image'
    });

    const sigData = sigResponse.data?.data || sigResponse.data;
    if (!sigData || !sigData.signature) {
      throw new Error("Không lấy được chữ ký từ Backend");
    }

    // Bước 2: Đóng gói và bắn thẳng lên Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', sigData.apiKey);
    formData.append('timestamp', sigData.timestamp);
    formData.append('signature', sigData.signature);
    formData.append('folder', sigData.folder);
    if (sigData.publicId) formData.append('public_id', sigData.publicId);

    const cloudinaryRes = await fetch(sigData.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    const cloudinaryData = await cloudinaryRes.json();
    if (!cloudinaryRes.ok) {
      throw new Error(cloudinaryData.error?.message || 'Lỗi upload Cloudinary');
    }

    // Bước 3: Đăng ký thông tin media vừa up vào DB (Theo media.routes.js)
    await api.post('/media/cloudinary/register', {
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      url: cloudinaryData.secure_url,
      publicId: cloudinaryData.public_id,
      resourceType: cloudinaryData.resource_type
    });

    // Trả về link xịn cho Profile cập nhật
    return { url: cloudinaryData.secure_url };
  },

  // ── CÁC API ADMIN (GIỮ NGUYÊN) ──
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

};
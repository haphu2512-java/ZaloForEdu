import api from "./authService"; // Chú ý đường dẫn import authService của chị

export const userService = {
  // ── 1. API CHO PROFILE CÁ NHÂN (Dùng qua /auth) ──

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (data) => {
    const hasAvatarFile = data?.avatarFile instanceof File;
    let payload = data;
    let config = undefined;

    if (hasAvatarFile) {
      const formData = new FormData();
      if (data.fullName) formData.append('fullName', data.fullName);
      if (data.phoneNumber) formData.append('phoneNumber', data.phoneNumber);
      if (data.dateOfBirth) formData.append('dateOfBirth', data.dateOfBirth);
      if (data.bio !== undefined) formData.append('bio', data.bio);
      if (data.department) formData.append('department', data.department);
      formData.append('avatar', data.avatarFile);

      payload = formData;
      config = { headers: { 'Content-Type': 'multipart/form-data' } };
    }

    const response = await api.put('/auth/update-profile', payload, config);
    return response.data;
  },

  // ── 2. API CHO ADMIN - STANDARD USER CRUD (Dùng qua /users) ──

  // Lấy danh sách tất cả user
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },

  // Tìm kiếm user theo query (VD: ?email=abc&role=student)
  searchUsers: async (queryParams) => {
    const response = await api.get('/users/search', { params: queryParams });
    return response.data;
  },

  // Lấy chi tiết 1 user bằng ID
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // Cập nhật 1 user bằng ID
  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  // Xóa 1 user bằng ID
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  // ── 3. API CHO ADMIN - QUẢN LÝ GIẢNG VIÊN ──

  createTeacher: async (data) => {
    const response = await api.post("/users/teacher", data);
    return response.data;
  },

  getAllTeachers: async () => {
    const response = await api.get("/users/teachers");
    return response.data;
  },
};

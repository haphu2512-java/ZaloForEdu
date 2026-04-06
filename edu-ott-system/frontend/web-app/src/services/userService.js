import api from "./authService";

export const userService = {
  // Tạo tài khoản giáo viên mới - admin
  createTeacher: (data) => api.post("/users/teacher", data),

  // Lấy danh sách toàn bộ giảng viên
  getAllTeachers: () => api.get("/users/teachers"),

  // Tương lai có thể thêm: get all user or xóa user
};

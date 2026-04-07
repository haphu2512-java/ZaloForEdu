import { create } from "zustand";
import { authService } from "../services/authService";

const getErrorMessage = (err, fallback) => {
  if (err.code === "ECONNABORTED") return "Kết nối quá thời gian. Vui lòng kiểm tra server backend.";
  if (err.code === "ERR_NETWORK") return "Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.";
  return err.response?.data?.message || fallback;
};

export const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.login(email, password);
      const { user, token, refreshToken } = res.data.data;
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }
      set({ user, token, isAuthenticated: true, isLoading: false });
      return { success: true, role: user.role };
    } catch (err) {
      if (err.response?.data?.errorCode === "EMAIL_NOT_VERIFIED") {
        set({ isLoading: false });
        return { 
          success: false, 
          errorCode: "EMAIL_NOT_VERIFIED", 
          email: err.response.data.email, 
          error: err.response.data.message 
        };
      }
      const msg = getErrorMessage(err, "Đăng nhập thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg, errorCode: err.response?.data?.errorCode };
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(data);
      const email = res.data.data.email;
      set({ isLoading: false });
      return { success: true, email };
    } catch (err) {
      const msg = getErrorMessage(err, "Đăng ký thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  verifyEmail: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      await authService.verifyEmail(email, otp);
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = getErrorMessage(err, "Xác thực thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await authService.logout(refreshToken);
    } catch (_) {
      // Ignore API logout failure and clear local state regardless.
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));


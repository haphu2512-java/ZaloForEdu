import { create } from "zustand";
import { authService } from "../services/authService";

// Detect device type from User-Agent (web = browser, mobile = phone browser)
const detectDevice = () => {
  const ua = navigator.userAgent || "";
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  return isMobile ? "mobile" : "web";
};

const getErrorMessage = (err, fallback) => {
  if (err.code === "ECONNABORTED") return "Kết nối quá thời gian. Vui lòng kiểm tra server backend.";
  if (err.code === "ERR_NETWORK") return "Không thể kết nối đến server. Vui lòng kiểm tra backend đang chạy.";
  
  const backendErr = err.response?.data?.error;
  if (backendErr) {
    if (backendErr.message === "Invalid payload" && backendErr.details?.fieldErrors) {
      const fieldErrs = backendErr.details.fieldErrors;
      const firstField = Object.keys(fieldErrs)[0];
      if (firstField && fieldErrs[firstField].length > 0) {
        return fieldErrs[firstField][0];
      }
    }
    return backendErr.message;
  }

  return err.response?.data?.message || fallback;
};

export const useAuthStore = create((set, get) => ({
  user: JSON.parse(localStorage.getItem("user") || "null"),
  token: localStorage.getItem("token") || null,
  isAuthenticated: !!localStorage.getItem("token"),
  isLoading: false,
  error: null,

  // ── Login ──────────────────────────────────────────────────
  login: async ({ email, phone, password }) => {
    set({ isLoading: true, error: null });
    const device = detectDevice();
    try {
      const res = await authService.login({ email, phone, password, device });
      const { user, accessToken, refreshToken } = res.data.data;

      // //them tạm để test admin
      // user.role = "admin";
      localStorage.setItem("token", accessToken);
      localStorage.setItem("user", JSON.stringify(user));
      const currentUserId = user._id || user.id; 
      if (currentUserId) {
        localStorage.setItem("userId", currentUserId);
      }
      if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
      set({ user, token: accessToken, isAuthenticated: true, isLoading: false });
      return { success: true, role: user.role };
    } catch (err) {
      // Session expired on another device
      if (err.response?.data?.error?.code === "SESSION_EXPIRED") {
        const msg = "Tài khoản của bạn đã đăng nhập trên thiết bị khác.";
        set({ isLoading: false, error: msg });
        return { success: false, error: msg, errorCode: "SESSION_EXPIRED" };
      }
      const msg = getErrorMessage(err, "Đăng nhập thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg, errorCode: err.response?.data?.error?.code };
    }
  },

  // ── Register ───────────────────────────────────────────────
  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.register(data);
      const { registrationMethod, email, phone } = res.data.data;
      set({ isLoading: false });
      return { success: true, registrationMethod, email, phone };
    } catch (err) {
      const msg = getErrorMessage(err, "Đăng ký thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg, errorCode: err.response?.data?.error?.code };
    }
  },

  // ── Verify OTP (email or phone) ────────────────────────────
  verifyOtp: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authService.verifyOtp(payload);
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = getErrorMessage(err, "Mã OTP không hợp lệ");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Resend OTP ─────────────────────────────────────────────
  resendOtp: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resendOtp(payload);
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = getErrorMessage(err, "Gửi lại OTP thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Forgot password ────────────────────────────────────────
  forgotPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await authService.forgotPassword(payload);
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = getErrorMessage(err, "Gửi OTP thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg, errorCode: err.response?.data?.error?.code };
    }
  },

  verifyForgotOtp: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const res = await authService.verifyForgotOtp(payload);
      const { resetToken } = res.data.data;
      set({ isLoading: false });
      return { success: true, resetToken };
    } catch (err) {
      const msg = getErrorMessage(err, "Mã OTP không hợp lệ");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  resetPassword: async (token, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await authService.resetPassword(token, newPassword);
      set({ isLoading: false });
      return { success: true };
    } catch (err) {
      const msg = getErrorMessage(err, "Đặt lại mật khẩu thất bại");
      set({ isLoading: false, error: msg });
      return { success: false, error: msg };
    }
  },

  // ── Logout ─────────────────────────────────────────────────
  logout: async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await authService.logout(refreshToken);
    } catch (_) { /* ignore */ }
    finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  clearError: () => set({ error: null }),
}));

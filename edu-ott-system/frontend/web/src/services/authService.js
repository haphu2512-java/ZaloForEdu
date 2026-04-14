import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10000,
});

// Auto attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthError = error.response?.status === 401;
    const isSessionExpired = error.response?.data?.errorCode === "SESSION_EXPIRED";

    if (isAuthError || isSessionExpired) {
      // Clear all local session data
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      
      // Force reload to trigger App.jsx auth redirection logic
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?expired=true";
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  // Nhận object { email?, phone?, password, device }
  login: (payload) => api.post("/auth/login", payload),

  // Nhận { username?, email?, phone?, password }
  register: (data) => api.post("/auth/register", data),

  logout: (refreshToken) =>
    api.post("/auth/logout", refreshToken ? { refreshToken } : {}),

  logoutAll: () => api.post("/auth/logout-all"),

  getMe: () => api.get("/auth/me"),

  // Xác thực OTP (dùng chung cho cả email và phone)
  // payload: { token: "123456", email? } hoặc { token: "123456", phone? }
  verifyOtp: (payload) => api.post("/auth/verify-otp", payload),

  // Gửi lại OTP
  // payload: { email? } hoặc { phone? }
  resendOtp: (payload) => api.post("/auth/resend-otp", payload),

  // Quên mật khẩu Step 1: Gửi OTP về email/phone
  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),

  // Quên mật khẩu Step 2: Xác thực OTP → nhận resetToken
  verifyForgotOtp: (payload) => api.post("/auth/verify-forgot-otp", payload),

  // Quên mật khẩu Step 3: Dùng resetToken để đặt mật khẩu mới
  resetPassword: (token, newPassword) =>
    api.post("/auth/reset-password", { token, newPassword }),

  changePassword: (data) => api.post("/auth/change-password", data),

  // Chặn hoặc bỏ chặn người dùng
  // action: 'block' | 'unblock'
  blockOrUnblockUser: (targetId, action = "block") =>
    api.put(`/users/${targetId}/block`, { action }),
};

export default api;

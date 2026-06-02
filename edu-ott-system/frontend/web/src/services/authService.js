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

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise = null;

// Refresh access token
const refreshAccessToken = async () => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) {
        console.log('[Token] No refresh token available');
        return null;
      }

      console.log('[Token] Refreshing access token...');
      const response = await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken });
      
      const newAccessToken = response.data.data?.accessToken || response.data.accessToken;
      const newRefreshToken = response.data.data?.refreshToken || response.data.refreshToken;

      if (newAccessToken) {
        localStorage.setItem("token", newAccessToken);
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }
        console.log('[Token] Access token refreshed successfully');
        return newAccessToken;
      }

      return null;
    } catch (error) {
      console.error('[Token] Refresh failed:', error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Auto handle 401 errors with token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthError = error.response?.status === 401;
    const isSessionExpired = error.response?.data?.errorCode === "SESSION_EXPIRED";
    const isForbiddenToken = error.response?.status === 403 && 
                            error.response?.data?.error?.message?.toLowerCase().includes('token');

    // Check if this is an auth error and we haven't retried yet
    if ((isAuthError || isForbiddenToken) && !originalRequest._retry) {
      originalRequest._retry = true;

      console.log('[Token] Auth error detected, attempting refresh...');
      const newToken = await refreshAccessToken();

      if (newToken) {
        // Update the authorization header and retry
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        console.log('[Token] Retrying request with new token...');
        return api(originalRequest);
      }
    }

    // If refresh failed or session expired, logout
    if (isAuthError || isSessionExpired || isForbiddenToken) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login?reason=session_expired";
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

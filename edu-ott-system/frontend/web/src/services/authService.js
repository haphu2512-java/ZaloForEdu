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

export const authService = {
  login: (email, password) => api.post("/auth/login", { email, password }),

  register: (data) => api.post("/auth/register", data),

  logout: (refreshToken) =>
    api.post("/auth/logout", refreshToken ? { refreshToken } : {}),

  getMe: () => api.get("/auth/me"),

  forgotPassword: (email) => api.post("/auth/forgot-password", { email }),

  resetPassword: (token, password) =>
    api.put(`/auth/reset-password/${token}`, { password }),

  verifyEmail: (email, otp) => api.post("/auth/verify-email", { email, otp }),

  resendVerification: (email) => api.post("/auth/resend-verification", { email }),

  changePassword: (data) => api.put("/auth/change-password", data),
};

export default api;

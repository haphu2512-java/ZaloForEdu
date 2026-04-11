// ============================================================
// Auth Types - Khớp 1:1 với Backend User & Auth API schema
// Backend: Node.js/Express + MongoDB (OTT Messaging Platform)
// ============================================================

/** User model khớp với backend User.toJSON() output */
export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string | null;
  avatarUrl?: string | null;
  isOnline: boolean;
  lastSeen?: string | null;
  friends: string[];
  blockedUsers: string[];
  createdAt: string;
  updatedAt: string;
  isEmailVerified?: boolean;
}

/** Response chuẩn từ backend */
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
}

/** Data trả về khi login/register thành công */
export interface AuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** Kết quả login/register trả về cho context */
export interface AuthResponse {
  success: boolean;
  user: User;
  accessToken: string;
  refreshToken: string;
}

/** POST /auth/login body */
export interface LoginPayload {
  email?: string;
  username?: string;
  phone?: string;
  password: string;
}

/** POST /auth/register body */
export interface RegisterPayload {
  username?: string;
  email?: string;
  password: string;
  phone?: string;
}

/** PUT /users/:id body */
export interface UpdateProfilePayload {
  username?: string;
  email?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
}

/** POST /auth/refresh-token body */
export interface RefreshTokenPayload {
  refreshToken: string;
}

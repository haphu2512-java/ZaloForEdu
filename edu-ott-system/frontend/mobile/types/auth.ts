// ============================================================
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/types/auth.ts
// Auth Types - Khớp 1:1 với Backend Auth API schema
// ============================================================

export interface User {
  _id: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin';
  avatar?: string | null;
  studentId?: string;
  phoneNumber?: string | null;
  dateOfBirth?: string | null;
  bio?: string;
  department?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLogin?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface UpdateProfilePayload {
  fullName?: string;
  avatar?: string;
  avatarFile?: {
    uri: string;
    name?: string;
    type?: string;
  };
  phoneNumber?: string;
  dateOfBirth?: string;
  bio?: string;
  department?: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  password: string;
}

export interface VerifyEmailPayload {
  email?: string;
  otp?: string;
  token?: string;
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/types/auth.ts
}

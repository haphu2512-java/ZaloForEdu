// ============================================================
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
}

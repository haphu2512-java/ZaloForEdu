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
  bio?: string;
  department?: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
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
  password?: string;
  role: 'student' | 'teacher' | 'admin';
}

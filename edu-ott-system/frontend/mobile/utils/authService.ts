import { fetchAPI } from './api';
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  User,
  UpdateProfilePayload,
} from '../types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Auth Service - Gọi API Backend và quản lý Local Storage Token
// Backend endpoints: /api/v1/auth/*  and  /api/v1/users/*
// ============================================================

const AUTH_ENDPOINT = '/auth';
const USERS_ENDPOINT = '/users';

// ==================== TOKEN MANAGEMENT ====================

/** Lưu Access Token vào Storage thiết bị */
export const storeToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error saving token', error);
  }
};

/** Lưu Refresh Token */
export const storeRefreshToken = async (token: string) => {
  try {
    await AsyncStorage.setItem('refreshToken', token);
  } catch (error) {
    console.error('Error saving refresh token', error);
  }
};

/** Lưu User info vào local storage (offline cache) */
export const storeUserInfo = async (user: User) => {
  try {
    await AsyncStorage.setItem('userInfo', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user info', error);
  }
};

/** Lấy Token từ Storage */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

/** Lấy Refresh Token */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('refreshToken');
  } catch (error) {
    console.error('Error getting refresh token', error);
    return null;
  }
};

/** Lấy cached User info */
export const getCachedUserInfo = async (): Promise<User | null> => {
  try {
    const data = await AsyncStorage.getItem('userInfo');
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cached user info', error);
    return null;
  }
};

/** Xoá Token khỏi thiết bị */
export const removeToken = async () => {
  try {
    await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userInfo']);
  } catch (error) {
    console.error('Error removing token', error);
  }
};

/** Lấy Token nhúng vào Header request */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ==================== AUTH API CALLS ====================

/**
 * Đăng nhập
 * POST /auth/login { email|username, password }
 * Response: { success, data: { user, accessToken, refreshToken }, message }
 */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const authData = res.data || {};
  const { user, accessToken, refreshToken } = authData;

  if (accessToken) {
    await storeToken(accessToken);
    if (refreshToken) {
      await storeRefreshToken(refreshToken);
    }
    if (user) {
      await storeUserInfo(user);
    }
  }

  return { success: true, user, accessToken, refreshToken };
}

/**
 * Đăng ký
 * POST /auth/register { username, email, password, phone? }
 * Response: { success, data: { user, accessToken, refreshToken }, message }
 */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const authData = res.data || {};
  const { user, accessToken, refreshToken } = authData;
  // Register should not auto-login user. User must verify then login manually.
  return { success: true, user, accessToken, refreshToken };
}

/**
 * Refresh token
 * POST /auth/refresh-token { refreshToken }
 * Response: { success, data: { user, accessToken, refreshToken }, message }
 */
export async function refreshAccessToken(): Promise<AuthResponse | null> {
  const currentRefreshToken = await getRefreshToken();
  if (!currentRefreshToken) return null;

  try {
    const res = await fetchAPI(`${AUTH_ENDPOINT}/refresh-token`, {
      method: 'POST',
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });

    const authData = res.data || {};
    const { user, accessToken, refreshToken } = authData;

    if (accessToken) {
      await storeToken(accessToken);
      if (refreshToken) {
        await storeRefreshToken(refreshToken);
      }
      if (user) {
        await storeUserInfo(user);
      }
    }

    return { success: true, user, accessToken, refreshToken };
  } catch (error) {
    console.error('Failed to refresh token:', error);
    await removeToken();
    return null;
  }
}

/**
 * Lấy user profile theo id
 * GET /users/:id
 * Response: { success, data: User, message }
 */
export async function getUserById(userId: string): Promise<User> {
  const res = await fetchAPI(`${USERS_ENDPOINT}/${userId}`);
  return res.data;
}

/**
 * Cập nhật Profile
 * PUT /users/:id { username?, phone?, avatarUrl? }
 */
export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<User> {
  const res = await fetchAPI(`${USERS_ENDPOINT}/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  const user = res.data;
  if (user) {
    await storeUserInfo(user);
  }
  return user;
}

/**
 * Đăng xuất
 * POST /auth/logout { refreshToken }
 */
export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken();
  try {
    if (refreshToken) {
      await fetchAPI(`${AUTH_ENDPOINT}/logout`, {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (e) {
    console.warn('Logout API failed, continuing to clear local state', e);
  } finally {
    await removeToken();
  }
}

/**
 * Đăng xuất tất cả thiết bị
 * POST /auth/logout-all (requires Bearer token)
 */
export async function logoutAll(): Promise<void> {
  try {
    await fetchAPI(`${AUTH_ENDPOINT}/logout-all`, {
      method: 'POST',
    });
  } catch (e) {
    console.warn('Logout all API failed', e);
  } finally {
    await removeToken();
  }
}

/**
 * Xác thực email
 * POST /auth/verify-email { token }
 */
export async function verifyEmail(token: string): Promise<void> {
  await fetchAPI(`${AUTH_ENDPOINT}/verify-email`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

/**
 * Gửi lại mã OTP xác thực email cho user đang đăng nhập
 * POST /auth/resend-verification
 */
export async function resendVerificationEmail(email: string): Promise<void> {
  await fetchAPI(`${AUTH_ENDPOINT}/resend-verification`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

/**
 * Quên mật khẩu
 * POST /auth/forgot-password { email, phone }
 */
export async function forgotPassword(payload: { email?: string; phone?: string }): Promise<void> {
  await fetchAPI(`${AUTH_ENDPOINT}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Đặt lại mật khẩu
 * POST /auth/reset-password { token, newPassword }
 */
export async function resetPassword(payload: { token: string; newPassword: string }): Promise<void> {
  await fetchAPI(`${AUTH_ENDPOINT}/reset-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Đổi mật khẩu
 * POST /auth/change-password { currentPassword, newPassword }
 */
export async function changePassword(payload: { currentPassword: string; newPassword: string }): Promise<void> {
  await fetchAPI(`${AUTH_ENDPOINT}/change-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
import { fetchAPI, API_BASE_URL } from './api';
=======
import { fetchAPI } from './api';
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  User,
  UpdateProfilePayload,
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
} from '../types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Auth Service - Gọi API Backend và quản lý Local Storage Token
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
// ============================================================

const AUTH_ENDPOINT = '/auth';

/** Lưu Token vào Storage thiết bị */
=======
// Backend endpoints: /api/v1/auth/*  and  /api/v1/users/*
// ============================================================

const AUTH_ENDPOINT = '/auth';
const USERS_ENDPOINT = '/users';

// ==================== TOKEN MANAGEMENT ====================

/** Lưu Access Token vào Storage thiết bị */
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
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

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
=======
/** Lưu User info vào local storage (offline cache) */
export const storeUserInfo = async (user: User) => {
  try {
    await AsyncStorage.setItem('userInfo', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user info', error);
  }
};

>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
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

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
/** Xoá Token khỏi thiết bị */
export const removeToken = async () => {
  try {
    await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
  } catch (error) {
    console.error('Error removing token', error);
  }
};

/** Lấy Token nhúng vào Header request */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
// ===================== AUTH API CALLS =====================

/** Đăng nhập */
=======
// ==================== AUTH API CALLS ====================

/**
 * Đăng nhập
 * POST /auth/login { email|username, password }
 * Response: { success, data: { user, accessToken, refreshToken }, message }
 */
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const authData = res.data || {};
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
  if (authData.token) {
    await storeToken(authData.token);
    if (authData.refreshToken) {
      await storeRefreshToken(authData.refreshToken);
    }
  }
  return { success: true, token: authData.token, user: authData.user };
}

/** Đăng ký */
export async function register(payload: RegisterPayload): Promise<{ success: boolean; message?: string; verificationToken?: string }> {
  const { fullName, email, password } = payload;
  const res = await fetchAPI(`${AUTH_ENDPOINT}/register`, {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password }),
  });

  return { success: true, message: res.message, verificationToken: res.data?.verificationToken };
}

/** Xác thực Email */
export async function verifyEmail(payload: VerifyEmailPayload): Promise<{ success: boolean; message?: string }> {
  const email = payload.email?.trim();
  const otp = payload.otp?.trim();
  const token = payload.token?.trim();

  // New backend flow: verify with email + OTP
  if (email && otp) {
    try {
      const res = await fetchAPI(`${AUTH_ENDPOINT}/verify-email`, {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
      });
      return { success: true, message: res.message };
    } catch (error: any) {
      // Backward compatibility with old token-based API
      const fallbackToken = token || otp;
      const shouldFallback = fallbackToken && (
        /token/i.test(error?.message || '') ||
        /otp/i.test(error?.message || '') ||
        error?.message === 'Error executing request'
      );
      if (!shouldFallback) throw error;
    }
  }

  if (token || otp) {
    const res = await fetchAPI(`${AUTH_ENDPOINT}/verify-email`, {
      method: 'POST',
      body: JSON.stringify({ token: token || otp }),
    });
    return { success: true, message: res.message };
  }

  throw new Error('Thiếu thông tin xác thực email');
}

/** Gửi lại email xác thực */
export async function resendVerification(email: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/resend-verification`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return { success: true, message: res.message };
}

/** Lấy Current User Info (kiểm tra token còn hạn không) */
export async function getMe(): Promise<{ success: boolean; data: User }> {
  const headers = await getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('No token found');
  }

  const res = await fetchAPI(`${AUTH_ENDPOINT}/me`, {
    method: 'GET',
    headers,
  });

  return { success: true, data: res.data?.user };
}

/** Cập nhật Profile */
export async function updateProfile(payload: UpdateProfilePayload): Promise<{ success: boolean; data: User }> {
  const headers = await getAuthHeaders();
  let body: any = JSON.stringify(payload);
  const requestHeaders: Record<string, string> = { ...headers };

  if (payload.avatarFile?.uri) {
    const formData = new FormData();

    if (payload.fullName) formData.append('fullName', payload.fullName);
    if (payload.phoneNumber) formData.append('phoneNumber', payload.phoneNumber);
    if (payload.dateOfBirth) formData.append('dateOfBirth', payload.dateOfBirth);
    if (payload.bio !== undefined) formData.append('bio', payload.bio);
    if (payload.department) formData.append('department', payload.department);

    const uri = payload.avatarFile.uri;
    const filename = payload.avatarFile.name || uri.split('/').pop() || 'avatar.jpg';
    const type = payload.avatarFile.type || (/\.(\w+)$/.exec(filename)?.[1]
      ? `image/${/\.(\w+)$/.exec(filename)?.[1]}`
      : 'image/jpeg');

    formData.append('avatar', {
      uri,
      name: filename,
      type,
    } as any);

    body = formData;
  }

  const res = await fetchAPI(`${AUTH_ENDPOINT}/update-profile`, {
    method: 'PUT',
    headers: requestHeaders,
    body,
  });
  return { success: true, data: res.data?.user };
}

/** Đổi mật khẩu */
export async function changePassword(payload: ChangePasswordPayload): Promise<{ success: boolean; message?: string }> {
  const headers = await getAuthHeaders();
  const res = await fetchAPI(`${AUTH_ENDPOINT}/change-password`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });
  return { success: true, message: res.message };
}

/** Quên mật khẩu - gửi email reset */
export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ success: boolean; message?: string; resetToken?: string }> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/forgot-password`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return { success: true, message: res.message, resetToken: res.data?.resetToken || res.resetToken };
}

/** Reset mật khẩu bằng token */
export async function resetPassword(token: string, payload: ResetPasswordPayload): Promise<{ success: boolean; message?: string }> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/reset-password/${token}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return { success: true, message: res.message };
}

/** Upload avatar - sử dụng FormData cho multipart upload */
export async function uploadAvatar(imageUri: string): Promise<{ success: boolean; url?: string }> {
  const headers = await getAuthHeaders();
  const token = await getToken();

  // Tạo FormData cho multipart upload 
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  formData.append('file', {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Upload failed');
  }

  return { success: true, url: data.data?.file?.url };
}

/** Đăng xuất gọi API blacklist token (nếu backend support) */
export async function logout(): Promise<void> {
  const headers = await getAuthHeaders();
  const refreshToken = await getRefreshToken();
  try {
    if (headers.Authorization) {
      await fetchAPI(`${AUTH_ENDPOINT}/logout`, {
        method: 'POST',
        headers,
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (e) {
    console.warn('Logout API failed, continuing to clear local state', e);
  } finally {
    await removeToken();
  }
}
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/utils/authService.ts
=======

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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/utils/authService.ts

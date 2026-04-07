import { fetchAPI, API_BASE_URL } from './api';
import type {
  LoginPayload,
  RegisterPayload,
  AuthResponse,
  User,
  UpdateProfilePayload,
  ChangePasswordPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from '../types/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// Auth Service - Gọi API Backend và quản lý Local Storage Token
// ============================================================

const AUTH_ENDPOINT = '/auth';

/** Lưu Token vào Storage thiết bị */
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

/** Xoá Token khỏi thiết bị */
export const removeToken = async () => {
  try {
    await AsyncStorage.multiRemove(['authToken', 'refreshToken']);
  } catch (error) {
    console.error('Error removing token', error);
  }
};

/** Lấy Token nhúng vào Header request */
export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===================== AUTH API CALLS =====================

/** Đăng nhập */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const authData = res.data || {};
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
        body: JSON.stringify({ refreshToken }),
      });
    }
  } catch (e) {
    console.warn('Logout API failed, continuing to clear local state', e);
  } finally {
    await removeToken();
  }
}

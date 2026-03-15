import { fetchAPI } from './api';
import type { LoginPayload, RegisterPayload, AuthResponse, User } from '../types/auth';
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

/** Lấy Token từ Storage */
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting token', error);
    return null;
  }
};

/** Xoá Token khởi thiết bị */
export const removeToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing token', error);
  }
};

/** Lấy Token nhúng vào Header request */
export const getAuthHeaders = async () => {
  const token = await getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Đăng nhập */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/login`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  if (res.data && res.data.token) {
    await storeToken(res.data.token);
  }
  return { success: true, token: res.data?.token, user: res.data?.user };
}

/** Đăng ký */
export async function register(payload: RegisterPayload): Promise<{ success: boolean; message?: string }> {
  const res = await fetchAPI(`${AUTH_ENDPOINT}/register`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  
  // API giờ trả về verificationToken ở dev, nhưng mobile chỉ cần biết tạo mới user thành công!
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

/** Đăng xuất gọi API blacklist token (nếu backend support) */
export async function logout(): Promise<void> {
  const headers = await getAuthHeaders();
  try {
    if (headers.Authorization) {
      await fetchAPI(`${AUTH_ENDPOINT}/logout`, {
        method: 'POST',
        headers,
      });
    }
  } catch (e) {
    console.warn('Logout API failed, continuing to clear local state', e);
  } finally {
    await removeToken();
  }
}

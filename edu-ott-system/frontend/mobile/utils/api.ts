import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get dynamically the IP address of the Expo bundler, or fallback to the local IP/Emulator
const hostUri = Constants.expoConfig?.hostUri;
const localhost = hostUri ? hostUri.split(':')[0] : '10.126.202.133';

function getApiBaseUrl(): string {
  // Web browser: use the current window hostname (which is localhost or the LAN IP)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return `http://${window.location.hostname}:5000/api/v1`;
    }
    return 'http://localhost:5000/api/v1';
  }
  // Android emulator without Expo host
  if (Platform.OS === 'android' && !hostUri) {
    return 'http://10.0.2.2:5000/api/v1';
  }
  // iOS / physical device: use Expo bundler's IP
  return `http://${localhost}:5000/api/v1`;
}

export const API_BASE_URL = getApiBaseUrl();

// Flag to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

// Refresh access token using refresh token
const refreshAccessToken = async (): Promise<string | null> => {
  // If already refreshing, wait for that promise
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        console.log('[Token] No refresh token available');
        return null;
      }

      console.log('[Token] Refreshing access token...');
      const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        console.error('[Token] Refresh failed:', response.status);
        // Clear tokens if refresh fails
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.data?.accessToken || data.accessToken;
      const newRefreshToken = data.data?.refreshToken || data.refreshToken;

      if (newAccessToken) {
        await AsyncStorage.setItem('authToken', newAccessToken);
        if (newRefreshToken) {
          await AsyncStorage.setItem('refreshToken', newRefreshToken);
        }
        console.log('[Token] Access token refreshed successfully');
        return newAccessToken;
      }

      return null;
    } catch (error) {
      console.error('[Token] Refresh error:', error);
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

export const fetchAPI = async (endpoint: string, options: RequestInit = {}, retryCount = 0): Promise<any> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  try {
    let url = `${API_BASE_URL}${endpoint}`;

    // Prevent GET caching (especially aggressive on iOS/some RN environments)
    if (!options.method || options.method === 'GET') {
      const char = url.includes('?') ? '&' : '?';
      url += `${char}_t=${Date.now()}`;
    }

    console.log(`Fetching: ${url}`);

    // Auto-attach auth token if available
    let authHeader: Record<string, string> = {};
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        authHeader = { Authorization: `Bearer ${token}` };
      }
    } catch (_) {
      // Silently ignore storage errors
    }

    const isMultipart = typeof FormData !== 'undefined' && options.body instanceof FormData;

    // Default headers (auth token is added automatically, can be overridden by options.headers)
    const headers: Record<string, string> = {
      ...authHeader,
      ...(options.headers as Record<string, string>),
    };

    // Let fetch auto-generate multipart boundary for FormData.
    if (!isMultipart && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, { ...options, headers, signal: controller.signal as any });
    clearTimeout(id);

    // Read response as text first, then try to parse as JSON
    const text = await response.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // Response is not JSON (e.g. rate limit plain text, HTML error page)
      console.error(`Non-JSON response from ${endpoint}:`, text.substring(0, 200));
      throw new Error(
        response.status === 429
          ? 'Quá nhiều request. Vui lòng thử lại sau.'
          : `Server trả về lỗi (${response.status}). Vui lòng thử lại.`
      );
    }

    if (!response.ok) {
      // Check if it's an authentication error (401 or 403 with invalid token)
      const isAuthError = response.status === 401 || 
                         (response.status === 403 && data.error?.message?.toLowerCase().includes('token'));
      
      if (isAuthError && retryCount === 0) {
        console.log('[Token] Auth error detected, attempting refresh...');
        const newToken = await refreshAccessToken();
        
        if (newToken) {
          // Retry the request with new token
          console.log('[Token] Retrying request with new token...');
          return fetchAPI(endpoint, options, retryCount + 1);
        } else {
          // Refresh failed, user needs to login again
          console.log('[Token] Refresh failed, user needs to login');
          const err: any = new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          err.errorCode = 'TOKEN_EXPIRED';
          err.statusCode = 401;
          throw err;
        }
      }

      // Backend error format: { success: false, error: { code, message } }
      const errorInfo = data.error || {};
      const err: any = new Error(errorInfo.message || data.message || 'Error executing request');
      if (errorInfo.code) err.errorCode = errorInfo.code;
      err.statusCode = response.status;
      throw err;
    }

    return data;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.error(`API Timeout on ${endpoint}`);
      throw new Error('Lỗi kết nối tới máy chủ (Timeout). Vui lòng kiểm tra lại mạng hoặc IP backend.');
    }
    console.error(`API Error on ${endpoint}:`, error.message);
    throw error; // Rethrow to preserve custom fields like errorCode
  }
};


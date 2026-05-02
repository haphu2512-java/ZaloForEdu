import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Simple event emitter for auth errors (React Native compatible)
const authErrorCallbacks: Array<() => void> = [];

export const onAuthError = (callback: () => void) => {
  authErrorCallbacks.push(callback);
  return () => {
    const index = authErrorCallbacks.indexOf(callback);
    if (index > -1) {
      authErrorCallbacks.splice(index, 1);
    }
  };
};

const emitAuthError = () => {
  authErrorCallbacks.forEach(callback => {
    try {
      callback();
    } catch (e) {
      console.error('[Auth] Error in auth error callback:', e);
    }
  });
};

// Get dynamically the IP address of the Expo bundler, or fallback via env
const hostUri = Constants.expoConfig?.hostUri;
const localhost = hostUri ? hostUri.split(':')[0] : '10.0.2.2';

function resolveNativeDevHost(): string {
  const host = hostUri ? hostUri.split(':')[0] : '';
  if (host && host !== 'localhost' && host !== '127.0.0.1') return host;
  return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
}

function normalizeLocalApiUrl(url: string): string {
  if (Platform.OS === 'web') return url;
  const normalized = url.trim();
  const localPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i;
  const match = normalized.match(localPattern);
  if (!match) return normalized;

  const protocol = normalized.toLowerCase().startsWith('https://') ? 'https' : 'http';
  const port = match[2] || ':5000';
  const path = match[3] || '/api/v1';
  return `${protocol}://${resolveNativeDevHost()}${port}${path}`;
}

function getApiBaseUrl(): string {
  // Prefer explicit env var (staging / production)
  const envUrl = Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL
    || process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return normalizeLocalApiUrl(envUrl);

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

export const fetchAPI = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 60000); // Increased timeout to 60s for media uploads

  try {
    let url = `${API_BASE_URL}${endpoint}`;

    // Prevent GET caching (especially aggressive on iOS/some RN environments)
    if (!options.method || options.method === 'GET') {
      const char = url.includes('?') ? '&' : '?';
      url += `${char}_t=${Date.now()}`;
    }

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
      
      if (isAuthError) {
        // Token expired or invalid → Clear session and logout
        await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'user']);
        
        // Emit event to AuthProvider for IMMEDIATE logout
        emitAuthError();
        
        // Disconnect socket
        try {
          const { disconnectSocket } = await import('./socketService');
          disconnectSocket();
        } catch (e) {
          // Ignore socket disconnect errors
        }
        
        const err: any = new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        err.errorCode = 'TOKEN_EXPIRED';
        err.statusCode = 401;
        throw err;
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
      throw new Error('Lỗi kết nối tới máy chủ (Timeout). Vui lòng kiểm tra lại mạng hoặc IP backend.');
    }
    // Only log non-auth errors to reduce noise
    if (error.errorCode !== 'TOKEN_EXPIRED') {
      console.error(`API Error on ${endpoint}:`, error.message);
    }
    throw error; // Rethrow to preserve custom fields like errorCode
  }
};


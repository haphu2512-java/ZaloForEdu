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

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
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
      const err: any = new Error(data.message || 'Error executing request');
      if (data.errorCode) err.errorCode = data.errorCode;
      if (data.email) err.email = data.email;
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


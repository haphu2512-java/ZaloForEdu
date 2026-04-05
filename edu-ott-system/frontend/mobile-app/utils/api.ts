import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get dynamically the IP address of the Expo bundler, or fallback to the local IP/Emulator
const hostUri = Constants.expoConfig?.hostUri;
const localhost = hostUri ? hostUri.split(':')[0] : '10.126.202.133';

export const API_BASE_URL = Platform.OS === 'android' && !hostUri
  ? 'http://10.0.2.2:5000/api/v1'
  : `http://${localhost}:5000/api/v1`;

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 10000);

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Fetching: ${url}`);

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers, signal: controller.signal as any });
    clearTimeout(id);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error executing request');
    }

    return data;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      console.error(`API Timeout on ${endpoint}`);
      throw new Error('Lỗi kết nối tới máy chủ (Timeout). Vui lòng kiểm tra lại mạng hoặc IP backend.');
    }
    console.error(`API Error on ${endpoint}:`, error.message);
    throw new Error(error.message || 'Lỗi không xác định khi kết nối API');
  }
};

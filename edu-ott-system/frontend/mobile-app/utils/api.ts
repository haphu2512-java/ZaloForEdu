import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Get dynamically the IP address of the Expo bundler, or fallback to the local IP/Emulator
const hostUri = Constants.expoConfig?.hostUri;
const localhost = hostUri ? hostUri.split(':')[0] : '192.168.100.39';

export const API_BASE_URL = Platform.OS === 'android' && !hostUri
  ? 'http://10.0.2.2:5000/api/v1'
  : `http://${localhost}:5000/api/v1`;

export const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`Fetching: ${url}`);

    // Default headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Error executing request');
    }

    return data;
  } catch (error) {
    console.error(`API Error on ${endpoint}:`, error);
    throw error;
  }
};

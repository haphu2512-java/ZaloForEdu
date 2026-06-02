import { fetchAPI } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface UserSettings {
  _id?: string;
  userId?: string;
  theme: ThemeMode;
  notifications: {
    pushEnabled: boolean;
    messageEnabled: boolean;
    groupEnabled: boolean;
    soundEnabled: boolean;
  };
}

let currentUserIdForTheme: string | null = null;
export function setCurrentUserIdForTheme(userId: string | null) {
  currentUserIdForTheme = userId;
}

function getThemeStorageKey() {
  return currentUserIdForTheme ? `userThemeMode_${currentUserIdForTheme}` : 'userThemeMode';
}

type ThemeListener = (theme: ThemeMode | null) => void;
const themeListeners = new Set<ThemeListener>();

function notifyThemeListeners(theme: ThemeMode | null) {
  themeListeners.forEach((listener) => listener(theme));
}

export function subscribeThemeMode(listener: ThemeListener): () => void {
  themeListeners.add(listener);
  return () => themeListeners.delete(listener);
}

export async function cacheThemeMode(theme: ThemeMode): Promise<void> {
  const key = getThemeStorageKey();
  await AsyncStorage.setItem(key, theme);
  notifyThemeListeners(theme);
}

export async function getCachedThemeMode(): Promise<ThemeMode | null> {
  const key = getThemeStorageKey();
  const value = await AsyncStorage.getItem(key);
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return null;
}

export async function reloadThemeMode(): Promise<void> {
  const mode = await getCachedThemeMode();
  notifyThemeListeners(mode);
}

export async function getMySettings(): Promise<UserSettings> {
  const res = await fetchAPI('/settings/me');
  if (res?.data?.theme) {
    await cacheThemeMode(res.data.theme);
  }
  return res.data;
}

export async function updateMySettings(payload: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetchAPI('/settings/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  if (res?.data?.theme) {
    await cacheThemeMode(res.data.theme);
  }
  return res.data;
}

import { fetchAPI } from './api';

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

export async function getMySettings(): Promise<UserSettings> {
  const res = await fetchAPI('/settings/me');
  return res.data;
}

export async function updateMySettings(payload: Partial<UserSettings>): Promise<UserSettings> {
  const res = await fetchAPI('/settings/me', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

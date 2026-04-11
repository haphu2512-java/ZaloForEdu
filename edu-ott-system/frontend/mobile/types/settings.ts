// ============================================================
// Settings Types - Khớp Backend UserSettings Model
// ============================================================

/** Backend UserSettings model */
export interface UserSettings {
  _id: string;
  id?: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  createdAt: string;
  updatedAt: string;
}

/** Notification preferences sub-object */
export interface NotificationSettings {
  pushEnabled: boolean;
  messageEnabled: boolean;
  groupEnabled: boolean;
  soundEnabled: boolean;
}

/** GET /settings/user response */
export interface GetSettingsResponse {
  settings: UserSettings;
}

/** PATCH /settings/user body - Update user settings */
export interface UpdateSettingsPayload {
  theme?: 'light' | 'dark' | 'system';
  notifications?: Partial<NotificationSettings>;
}

/** PATCH /settings/user/notifications body - Update only notifications */
export interface UpdateNotificationSettingsPayload {
  pushEnabled?: boolean;
  messageEnabled?: boolean;
  groupEnabled?: boolean;
  soundEnabled?: boolean;
}

/** Theme preference type */
export type ThemeMode = 'light' | 'dark' | 'system';

/** Socket event for settings change (if using real-time sync) */
export interface SettingsUpdateSocketEvent {
  settings: UserSettings;
  event: 'settings_updated';
}

import api from "./authService";

/**
 * Settings Service
 * Manages user settings including theme and notifications
 * Syncs with backend API to persist settings across devices
 */
export const settingsService = {
  /**
   * Get current user's settings from database
   * @returns {Promise} Settings object with theme and notifications
   */
  getMySettings: () => api.get("/settings/me"),

  /**
   * Update user settings
   * @param {Object} data - Settings to update (theme, notifications)
   * @returns {Promise} Updated settings object
   */
  updateMySettings: (data) => api.put("/settings/me", data),
};

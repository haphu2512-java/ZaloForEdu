import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { settingsService } from '../services/settingsService';
import { socketService } from '../services/socketService';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [themeMode, setThemeModeState] = useState('system');
  const [appliedTheme, setAppliedTheme] = useState('light');
  const [isLoading, setIsLoading] = useState(true);

  const getAutoTheme = useCallback(() => {
    const hour = new Date().getHours();
    return (hour >= 18 || hour < 6) ? 'dark' : 'light';
  }, []);

  // Load theme from database on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Check if user is logged in
        const token = localStorage.getItem('token');
        if (!token) {
          // Not logged in → use system default
          setThemeModeState('system');
          setIsLoading(false);
          return;
        }

        const res = await settingsService.getMySettings();
        const savedTheme = res.data?.data?.theme || 'system';
        setThemeModeState(savedTheme);
        localStorage.setItem('app-theme-mode', savedTheme); // Cache for offline
      } catch (error) {
        console.error('Failed to load theme from API:', error);
        // Fallback to localStorage if API fails
        const localTheme = localStorage.getItem('app-theme-mode') || 'system';
        setThemeModeState(localTheme);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Listen for logout event to reset theme
  useEffect(() => {
    const handleStorageChange = (e) => {
      // When token is removed (logout), reset theme to system
      if (e.key === 'token' && !e.newValue) {
        console.log('[ThemeContext] Logout detected via storage event, resetting theme');
        setThemeModeState('system');
        localStorage.removeItem('app-theme-mode');
      }
    };

    // Custom event for immediate logout detection (same tab)
    const handleLogoutEvent = () => {
      console.log('[ThemeContext] Logout event received, resetting theme immediately');
      setThemeModeState('system');
      localStorage.removeItem('app-theme-mode');
    };

    // Custom event for login - reload theme from API
    const handleLoginEvent = async () => {
      console.log('[ThemeContext] Login event received, loading theme from API');
      setIsLoading(true);
      try {
        const res = await settingsService.getMySettings();
        const savedTheme = res.data?.data?.theme || 'system';
        console.log('[ThemeContext] Loaded theme after login:', savedTheme);
        setThemeModeState(savedTheme);
        localStorage.setItem('app-theme-mode', savedTheme);
      } catch (error) {
        console.error('[ThemeContext] Failed to load theme after login:', error);
        // Fallback to system
        setThemeModeState('system');
      } finally {
        setIsLoading(false);
      }
    };

    // Listen for storage changes (works across tabs)
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for custom logout event (same tab, immediate)
    window.addEventListener('user-logout', handleLogoutEvent);
    
    // Listen for custom login event (same tab, reload theme)
    window.addEventListener('user-login', handleLoginEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('user-logout', handleLogoutEvent);
      window.removeEventListener('user-login', handleLoginEvent);
    };
  }, []);

  // Listen for real-time theme changes from other devices
  useEffect(() => {
    const handleSettingsChanged = (data) => {
      if (data.theme && data.theme !== themeMode) {
        console.log('[ThemeContext] Real-time theme update:', data.theme);
        setThemeModeState(data.theme);
        localStorage.setItem('app-theme-mode', data.theme);
      }
    };

    socketService.on('settings_changed', handleSettingsChanged);

    return () => {
      socketService.off('settings_changed', handleSettingsChanged);
    };
  }, [themeMode]);

  // Apply theme to DOM
  useEffect(() => {
    if (isLoading) return;

    let targetTheme = themeMode;
    if (themeMode === 'system') {
      targetTheme = getAutoTheme();
    }

    setAppliedTheme(targetTheme);
    document.documentElement.setAttribute('data-theme', targetTheme);

    // If system mode, check every minute for time change
    let interval;
    if (themeMode === 'system') {
      interval = setInterval(() => {
        const newTarget = getAutoTheme();
        if (newTarget !== appliedTheme) {
          setAppliedTheme(newTarget);
          document.documentElement.setAttribute('data-theme', newTarget);
        }
      }, 60000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [themeMode, getAutoTheme, appliedTheme, isLoading]);

  // Update theme and sync to API
  const setThemeMode = useCallback(async (newTheme) => {
    setThemeModeState(newTheme);
    localStorage.setItem('app-theme-mode', newTheme); // Cache immediately for instant UX

    try {
      await settingsService.updateMySettings({ theme: newTheme });
    } catch (error) {
      console.error('Failed to save theme to API:', error);
      // Theme is still applied locally, just not synced to server
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, appliedTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

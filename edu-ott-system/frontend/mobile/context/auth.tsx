import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../utils/authService';
import type { User, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth';
import { getMySettings, setCurrentUserIdForTheme, reloadThemeMode } from '../utils/settingsService';
import { getUserById } from '../utils/userService';
import { connectSocket, disconnectSocket } from '../utils/socketService';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateProfilePayload) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {
    throw new Error('AuthProvider not mounted');
  },
  register: async () => {},
  logout: async () => {},
  updateUser: async () => {},
  refreshUser: async () => {},
  setUser: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ============================================================
// Auth Service Functions
// Các hàm này gọi trực tiếp API và quản lý token, user info trong storage.
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const segments = useSegments();
  const router = useRouter();

  const syncThemeSettings = async () => {
    try {
      await getMySettings();
    } catch {
      // Ignore theme sync errors to avoid blocking auth flow.
    }
  };

  // Listen for real-time settings changes from other devices
  useEffect(() => {
    if (!user) return;

    const { getSocket } = require('../utils/socketService');
    const socket = getSocket();
    
    if (!socket) return;

    const handleSettingsChanged = async (data: { theme?: string; notifications?: any }) => {
      console.log('[Auth] Real-time settings update:', data);
      
      // Reload settings to sync with server
      try {
        await getMySettings();
      } catch (error) {
        console.error('[Auth] Failed to reload settings:', error);
      }
    };

    const handleYouBlockedUser = ({ targetId }: { targetId: string }) => {
      setUser((prev: any) => {
        if (!prev) return prev;
        const currentBlocked = prev.blockedUsers || [];
        if (currentBlocked.includes(targetId)) return prev;
        return { ...prev, blockedUsers: [...currentBlocked, targetId] };
      });
    };

    const handleYouUnblockedUser = ({ targetId }: { targetId: string }) => {
      setUser((prev: any) => {
        if (!prev) return prev;
        const currentBlocked = prev.blockedUsers || [];
        return { ...prev, blockedUsers: currentBlocked.filter((id: string) => id !== targetId) };
      });
    };

    socket.on('settings_changed', handleSettingsChanged);
    socket.on('you_blocked_user', handleYouBlockedUser);
    socket.on('you_unblocked_user', handleYouUnblockedUser);

    return () => {
      socket.off('settings_changed', handleSettingsChanged);
      socket.off('you_blocked_user', handleYouBlockedUser);
      socket.off('you_unblocked_user', handleYouUnblockedUser);
    };
  }, [user]);

  // Listen for force_logout event - ALWAYS active, not dependent on user
  useEffect(() => {
    const { getSocket } = require('../utils/socketService');
    
    const handleForceLogout = async () => {
      console.log('[Auth] Force logout received from server');
      
      // Clear storage and disconnect
      disconnectSocket();
      await authService.removeToken();
      setUser(null);
      
      // AuthProvider's useEffect will detect null user and redirect to login
    };

    // Setup listener
    const socket = getSocket();
    if (socket) {
      socket.on('force_logout', handleForceLogout);
    }

    // Check every 500ms if socket is connected and setup listener
    const interval = setInterval(() => {
      const currentSocket = getSocket();
      if (currentSocket && !currentSocket.hasListeners('force_logout')) {
        currentSocket.on('force_logout', handleForceLogout);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      const socket = getSocket();
      if (socket) {
        socket.off('force_logout', handleForceLogout);
      }
    };
  }, []); // No dependencies - always active

  // Khởi chạy App: Load cached user & try refresh token
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await authService.getToken();
        if (!token) {
          // No token, user not logged in
          setCurrentUserIdForTheme(null);
          await reloadThemeMode();
          setUser(null);
          setIsLoading(false);
          return;
        }

        // Load cached user info first for instant UX
        const cachedUser = await authService.getCachedUserInfo();
        if (cachedUser) {
          setCurrentUserIdForTheme(cachedUser._id || cachedUser.id);
          await reloadThemeMode();
          setUser(cachedUser);
        }

        // Try to refresh token to validate session is still active
        const refreshResult = await authService.refreshAccessToken();
        if (refreshResult?.success && refreshResult.user) {
          setCurrentUserIdForTheme(refreshResult.user._id || refreshResult.user.id);
          await reloadThemeMode();
          setUser(refreshResult.user);
          // Connect socket with fresh token
          if (refreshResult.accessToken) {
            connectSocket(refreshResult.accessToken);
          }
          await syncThemeSettings();
        } else {
          setCurrentUserIdForTheme(null);
          await reloadThemeMode();
          setUser(null);
        }
      } catch (error) {
        console.warn('[Auth] Error loading user:', error);
        await authService.removeToken();
        setCurrentUserIdForTheme(null);
        await reloadThemeMode();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadUser();
    
    // Listen for auth errors from fetchAPI - IMMEDIATE logout
    const { onAuthError } = require('../utils/api');
    const unsubscribe = onAuthError(async () => {
      console.log('[Auth] Auth error detected, logging out immediately...');
      disconnectSocket();
      await authService.removeToken();
      setCurrentUserIdForTheme(null);
      await reloadThemeMode();
      setUser(null);
    });
    
    return () => unsubscribe();
  }, []); // Run ONCE on mount

  // Root Navigation Router Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === ('(auth)' as any);
    const currentAuthScreen = segments[1] as string | undefined;
    const isVerifyScreen = currentAuthScreen === 'verify-email';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      if (!isVerifyScreen) {
        router.replace('/(tabs)' as any);
      }
    }
  }, [user, segments, isLoading]);

  const login = useCallback(async (payload: LoginPayload) => {
    // Disconnect old socket
    disconnectSocket();
    
    try {
      const res = await authService.login(payload);
      if (!res.user) throw new Error('Đăng nhập thất bại');
      
      // Connect socket with fresh token
      if (res.accessToken) {
        connectSocket(res.accessToken);
      }
      setCurrentUserIdForTheme(res.user._id || res.user.id);
      await reloadThemeMode();
      setUser(res.user);
      await syncThemeSettings();
      return res.user;
    } catch (error) {
      throw error;
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    // Registration does not auto-login. User must verify email/OTP first.
    // res.user and tokens are optional during registration flow.
    if (!res.success) throw new Error('Đăng ký thất bại');
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    await authService.logout();
    setCurrentUserIdForTheme(null);
    await reloadThemeMode();
    setUser(null);
  }, []);

  /** Cập nhật profile cho user hiện tại */
  const updateUser = useCallback(async (data: UpdateProfilePayload) => {
    if (!user?.id) throw new Error('Chưa đăng nhập');
    const updatedUser = await authService.updateProfile(user.id, data);
    if (updatedUser) {
      setUser(updatedUser);
    }
  }, [user?.id]);

  /** Refresh thông tin user từ server */
  const refreshUser = useCallback(async () => {
    if (!user?.id) return;
    try {
      const freshUser = await getUserById(user.id);
      if (freshUser) {
        setUser(freshUser);
        await authService.storeUserInfo(freshUser);
      }
    } catch (error) {
      console.warn('Failed to refresh user:', error);
    }
  }, [user?.id]);

  // Listen for new_notification to update user (e.g. friend_accepted)
  useEffect(() => {
    if (!user) return;
    const { getSocket } = require('../utils/socketService');
    
    const handleNewNotification = async (payload: any) => {
      console.log('[Auth] New notification:', payload);
      if (payload?.type === 'friend_accepted') {
        await refreshUser();
      }
    };

    const interval = setInterval(() => {
      const currentSocket = getSocket();
      if (currentSocket && !currentSocket.hasListeners('new_notification')) {
        currentSocket.on('new_notification', handleNewNotification);
      }
    }, 500);

    return () => {
      clearInterval(interval);
      const socket = getSocket();
      if (socket) {
        socket.off('new_notification', handleNewNotification);
      }
    };
  }, [user, refreshUser]);

  const contextValue = React.useMemo(
    () => ({ user, isLoading, login, register, logout, updateUser, refreshUser, setUser }),
    [user, isLoading, login, register, logout, updateUser, refreshUser]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}


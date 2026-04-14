import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as authService from '../utils/authService';
import type { User, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth';
import { getMySettings } from '../utils/settingsService';
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

  // Khá»Ÿi cháº¡y App: Load cached user & try refresh token
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await authService.getToken();
        if (token) {
          // Load cached user info first for instant UX
          const cachedUser = await authService.getCachedUserInfo();
          if (cachedUser) {
            setUser(cachedUser);
          }

          // Try to refresh token to validate session is still active
          const refreshResult = await authService.refreshAccessToken();
          if (refreshResult?.success && refreshResult.user) {
            setUser(refreshResult.user);
            // Connect socket ngay với token tươi - tránh race condition AsyncStorage
            if (refreshResult.accessToken) {
              connectSocket(refreshResult.accessToken);
            }
            await syncThemeSettings();
          } else {
            // Check if authService has removed the token due to expiration
            const tokenExists = await authService.getToken();
            if (!tokenExists) {
              setUser(null);
            }
          }
        }
      } catch (error) {
        console.warn('Lỗi kiểm tra session:', error);
        await authService.removeToken();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    loadUser();
  }, []);

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
    // Ngắt socket cũ triệt để trước
    disconnectSocket();
    const res = await authService.login(payload);
    if (!res.user) throw new Error('Đăng nhập thất bại');
    // Kết nối socket ngay với token tươi trong bộ nhớ - không đợi AsyncStorage
    if (res.accessToken) {
      connectSocket(res.accessToken);
    }
    setUser(res.user);
    await syncThemeSettings();
    return res.user;
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


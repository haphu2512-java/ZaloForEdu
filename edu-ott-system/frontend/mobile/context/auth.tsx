<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as authService from '../utils/authService';
import type { User, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth';
=======
﻿import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as authService from '../utils/authService';
import type { User, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth';
import { getMySettings } from '../utils/settingsService';
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
  login: (payload: LoginPayload) => Promise<void>;
=======
  login: (payload: LoginPayload) => Promise<User>;
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateProfilePayload) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
  login: async () => {},
=======
  login: async () => {
    throw new Error('AuthProvider not mounted');
  },
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
// AuthProvider - Quản lý trạng thái Current User toàn ứng dụng
// Chặn User chưa đăng nhập vào ứng dụng
=======
// AuthProvider - Quáº£n lÃ½ tráº¡ng thÃ¡i Current User toÃ n á»©ng dá»¥ng
// Cháº·n User chÆ°a Ä‘Äƒng nháº­p vÃ o á»©ng dá»¥ng
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const segments = useSegments();
  const router = useRouter();

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
  // Khởi chạy App: Check xem token còn sống không
=======
  const syncThemeSettings = async () => {
    try {
      await getMySettings();
    } catch {
      // Ignore theme sync errors to avoid blocking auth flow.
    }
  };

  // Khá»Ÿi cháº¡y App: Load cached user & try refresh token
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await authService.getToken();
        if (token) {
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
          const res = await authService.getMe();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
=======
          // Load cached user info first for instant UX
          const cachedUser = await authService.getCachedUserInfo();
          if (cachedUser) {
            setUser(cachedUser);
          }

          // Try to refresh token to validate session is still active
          const refreshResult = await authService.refreshAccessToken();
          if (refreshResult?.success && refreshResult.user) {
            setUser(refreshResult.user);
            await syncThemeSettings();
          } else if (!cachedUser) {
            // No cached user and failed to refresh â€” session expired
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
            await authService.removeToken();
            setUser(null);
          }
        }
      } catch (error) {
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
        console.warn('Lỗi kiểm tra session:', error);
=======
        console.warn('Lá»—i kiá»ƒm tra session:', error);
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx

    // Nếu chưa đăng nhập và cố vào (tabs) -> đá qua Login
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    }
    // Nếu đã đăng nhập nhưng đang đứng ở màn đăng nhập -> quăng vô (tabs)
    else if (user && inAuthGroup) {
      router.replace('/(tabs)' as any);
=======
    const currentAuthScreen = segments[1] as string | undefined;
    const isVerifyScreen = currentAuthScreen === 'verify-email';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    } else if (user && inAuthGroup) {
      if (!isVerifyScreen) {
        router.replace('/(tabs)' as any);
      }
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
    }
  }, [user, segments, isLoading]);

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
    if (!res.user) throw new Error(res.message || 'Lỗi đăng nhập');
    setUser(res.user);
=======
    if (!res.user) throw new Error('ÄÄƒng nháº­p tháº¥t báº¡i');
    setUser(res.user);
    await syncThemeSettings();
    return res.user;
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
    if (!res.success) throw new Error(res.message || 'Lỗi đăng ký');
    // Note: Do not `setUser()` here. Mobile flow now strictly requires user to Verify Email
    // and manually log in to get the JWT Token, unifying security standard with Web app.
=======
    if (!res.user) throw new Error('ÄÄƒng kÃ½ tháº¥t báº¡i');
    // Do not auto-login after register. User verifies email first, then logs in.
    setUser(null);
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
  /** Cập nhật profile cho user hiện tại */
  const updateUser = async (data: UpdateProfilePayload) => {
    const res = await authService.updateProfile(data);
    if (res.success && res.data) {
      setUser(res.data);
    }
  };

  /** Refresh lại thông tin user từ server */
  const refreshUser = async () => {
    try {
      const res = await authService.getMe();
      if (res.success && res.data) {
        setUser(res.data);
=======
  /** Cáº­p nháº­t profile cho user hiá»‡n táº¡i */
  const updateUser = async (data: UpdateProfilePayload) => {
    if (!user) throw new Error('ChÆ°a Ä‘Äƒng nháº­p');
    const updatedUser = await authService.updateProfile(user.id, data);
    if (updatedUser) {
      setUser(updatedUser);
    }
  };

  /** Refresh láº¡i thÃ´ng tin user tá»« server */
  const refreshUser = async () => {
    if (!user) return;
    try {
      const freshUser = await authService.getUserById(user.id);
      if (freshUser) {
        setUser(freshUser);
        await authService.storeUserInfo(freshUser);
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx
      }
    } catch (error) {
      console.warn('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateUser, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/context/auth.tsx
=======

>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/context/auth.tsx

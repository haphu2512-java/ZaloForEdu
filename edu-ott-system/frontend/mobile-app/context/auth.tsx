import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as authService from '../utils/authService';
import type { User, LoginPayload, RegisterPayload, UpdateProfilePayload } from '../types/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: UpdateProfilePayload) => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
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
// AuthProvider - Quản lý trạng thái Current User toàn ứng dụng
// Chặn User chưa đăng nhập vào ứng dụng
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const segments = useSegments();
  const router = useRouter();

  // Khởi chạy App: Check xem token còn sống không
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await authService.getToken();
        if (token) {
          const res = await authService.getMe();
          if (res.success && res.data) {
            setUser(res.data);
          } else {
            await authService.removeToken();
            setUser(null);
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

    // Nếu chưa đăng nhập và cố vào (tabs) -> đá qua Login
    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login' as any);
    }
    // Nếu đã đăng nhập nhưng đang đứng ở màn đăng nhập -> quăng vô (tabs)
    else if (user && inAuthGroup) {
      router.replace('/(tabs)' as any);
    }
  }, [user, segments, isLoading]);

  const login = async (payload: LoginPayload) => {
    const res = await authService.login(payload);
    if (!res.user) throw new Error(res.message || 'Lỗi đăng nhập');
    setUser(res.user);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await authService.register(payload);
    if (!res.success) throw new Error(res.message || 'Lỗi đăng ký');
    // Note: Do not `setUser()` here. Mobile flow now strictly requires user to Verify Email
    // and manually log in to get the JWT Token, unifying security standard with Web app.
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

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

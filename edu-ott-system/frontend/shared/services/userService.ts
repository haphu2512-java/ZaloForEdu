import api from './api';
import type { User, RegisterRequest, LoginRequest, LoginResponse, UpdateProfileRequest } from '../types/user';

export const userService = {
    // Register new user
    register: async (data: RegisterRequest): Promise<User> => {
        const response = await api.post<User>('/users/register', data);
        return response.data;
    },

    // Login
    login: async (credentials: LoginRequest): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/users/login', credentials);
        return response.data;
    },

    // Get user profile
    getProfile: async (userId: string): Promise<User> => {
        const response = await api.get<User>(`/users/${userId}`);
        return response.data;
    },

    // Update profile
    updateProfile: async (userId: string, data: UpdateProfileRequest): Promise<User> => {
        const response = await api.put<User>(`/users/${userId}`, data);
        return response.data;
    },

    // Logout
    logout: async (): Promise<void> => {
        await api.post('/users/logout');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },
};

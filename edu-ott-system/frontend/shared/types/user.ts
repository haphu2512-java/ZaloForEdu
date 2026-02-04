// User types
export interface User {
    userId: string;
    username: string;
    email: string;
    phone: string;
    avatarUrl?: string;
    status: 'online' | 'offline' | 'away';
    lastSeen: number;
    firstName?: string;
    lastName?: string;
    bio?: string;
}

export interface RegisterRequest {
    username: string;
    email: string;
    phone: string;
    password: string;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    token: string;
    user: User;
}

export interface UpdateProfileRequest {
    firstName?: string;
    lastName?: string;
    bio?: string;
    avatarUrl?: string;
}

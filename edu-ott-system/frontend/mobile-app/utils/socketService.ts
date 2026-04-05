import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Derive the base socket URL (same logic as api.ts)
const hostUri = Constants.expoConfig?.hostUri;
const localhost = hostUri ? hostUri.split(':')[0] : '10.126.202.133';

function getSocketUrl(): string {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      return `http://${window.location.hostname}:5000`;
    }
    return 'http://localhost:5000';
  }
  if (Platform.OS === 'android' && !hostUri) {
    return 'http://10.0.2.2:5000';
  }
  return `http://${localhost}:5000`;
}

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

/**
 * Connect to the socket server with the current auth token.
 */
export async function connectSocket(): Promise<Socket | null> {
  if (socket?.connected) return socket;

  try {
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      console.log('[Socket] No auth token, skipping connection');
      return null;
    }

    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket?.id);
    });

    socket.on('connect_error', (error) => {
      console.error('[Socket] Connection error:', error.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    return socket;
  } catch (error) {
    console.error('[Socket] Failed to connect:', error);
    return null;
  }
}

/**
 * Get the current socket instance.
 */
export function getSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect the socket.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log('[Socket] Disconnected manually');
  }
}

/**
 * Join a chat room (class, group, or conversation).
 */
export function joinRoom(roomId: string): void {
  socket?.emit('join:room', roomId);
}

/**
 * Leave a chat room.
 */
export function leaveRoom(roomId: string): void {
  socket?.emit('leave:room', roomId);
}

/**
 * Emit typing start event.
 */
export function emitTypingStart(roomId: string): void {
  socket?.emit('typing:start', { roomId });
}

/**
 * Emit typing stop event.
 */
export function emitTypingStop(roomId: string): void {
  socket?.emit('typing:stop', { roomId });
}

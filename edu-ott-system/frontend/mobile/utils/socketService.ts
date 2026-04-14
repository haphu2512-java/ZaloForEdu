import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================================
// Socket Service - Kết nối Socket.IO với Backend
// Backend events: join_conversation, send_message, typing,
//   stop_typing, message_delivered, message_seen,
//   new_message, user_online, user_offline
// ============================================================

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

    socket.on('socket_error', (data) => {
      console.warn('[Socket] Server error:', data.message);
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
 * Join a conversation room.
 * Backend event: 'join_conversation' { conversationId }
 */
export function joinConversation(conversationId: string): void {
  socket?.emit('join_conversation', { conversationId });
}

/**
 * Send a message via socket.
 * Backend event: 'send_message' { conversationId, content, mediaIds?, replyTo?, forwardFrom? }
 */
export function sendMessage(payload: {
  conversationId: string;
  content: string;
  mediaIds?: string[];
  replyTo?: string;
  forwardFrom?: string;
}): void {
  socket?.emit('send_message', payload);
}

/**
 * Emit typing indicator.
 * Backend event: 'typing' { conversationId }
 */
export function emitTyping(conversationId: string): void {
  socket?.emit('typing', { conversationId });
}

/**
 * Emit stop typing indicator.
 * Backend event: 'stop_typing' { conversationId }
 */
export function emitStopTyping(conversationId: string): void {
  socket?.emit('stop_typing', { conversationId });
}

/**
 * Notify server that a message has been delivered.
 * Backend event: 'message_delivered' { messageId }
 */
export function emitMessageDelivered(messageId: string): void {
  socket?.emit('message_delivered', { messageId });
}

/**
 * Notify server that a message has been seen/read.
 * Backend event: 'message_seen' { messageId }
 */
export function emitMessageSeen(messageId: string): void {
  socket?.emit('message_seen', { messageId });
}

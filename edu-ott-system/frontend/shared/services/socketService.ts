import { io, Socket } from 'socket.io-client';
import type { Message, TypingEvent } from '../types/message';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8083';

class SocketService {
    private socket: Socket | null = null;
    private listeners: Map<string, Function[]> = new Map();

    connect(token: string) {
        if (this.socket?.connected) {
            return;
        }

        this.socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket connected');
        });

        this.socket.on('disconnect', () => {
            console.log('❌ Socket disconnected');
        });

        this.socket.on('error', (error) => {
            console.error('Socket error:', error);
        });

        // Setup message listeners
        this.socket.on('message:new', (message: Message) => {
            this.emit('message:new', message);
        });

        this.socket.on('message:delivered', (messageId: string) => {
            this.emit('message:delivered', messageId);
        });

        this.socket.on('message:read', (messageId: string) => {
            this.emit('message:read', messageId);
        });

        this.socket.on('typing', (event: TypingEvent) => {
            this.emit('typing', event);
        });

        this.socket.on('user:online', (userId: string) => {
            this.emit('user:online', userId);
        });

        this.socket.on('user:offline', (userId: string) => {
            this.emit('user:offline', userId);
        });
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.listeners.clear();
        }
    }

    // Send message via socket
    sendMessage(message: any) {
        if (this.socket) {
            this.socket.emit('message:send', message);
        }
    }

    // Send typing indicator
    sendTyping(conversationId: string, isTyping: boolean) {
        if (this.socket) {
            this.socket.emit('typing', { conversationId, isTyping });
        }
    }

    // Subscribe to events
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)?.push(callback);
    }

    // Unsubscribe from events
    off(event: string, callback: Function) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    // Emit events to listeners
    private emit(event: string, data: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach((callback) => callback(data));
        }
    }
}

export const socketService = new SocketService();

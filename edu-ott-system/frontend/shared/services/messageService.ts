import api from './api';
import type { Message, Conversation, SendMessageRequest } from '../types/message';

export const messageService = {
    // Get conversations
    getConversations: async (): Promise<Conversation[]> => {
        const response = await api.get<Conversation[]>('/messages/conversations');
        return response.data;
    },

    // Get messages by conversation ID
    getMessages: async (conversationId: string, limit = 50, offset = 0): Promise<Message[]> => {
        const response = await api.get<Message[]>(`/messages/conversation/${conversationId}`, {
            params: { limit, offset },
        });
        return response.data;
    },

    // Send message
    sendMessage: async (data: SendMessageRequest): Promise<Message> => {
        const response = await api.post<Message>('/messages/send', data);
        return response.data;
    },

    // Mark message as read
    markAsRead: async (messageId: string): Promise<void> => {
        await api.put(`/messages/${messageId}/read`);
    },

    // Delete message
    deleteMessage: async (messageId: string): Promise<void> => {
        await api.delete(`/messages/${messageId}`);
    },

    // Search messages
    searchMessages: async (query: string): Promise<Message[]> => {
        const response = await api.get<Message[]>('/messages/search', {
            params: { q: query },
        });
        return response.data;
    },
};

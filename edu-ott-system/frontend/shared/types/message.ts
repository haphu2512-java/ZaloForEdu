// Message types
export interface Message {
    _id: string;
    conversationId: string;
    senderId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'file' | 'emoji';
    mediaUrl?: string;
    timestamp: number;
    status: 'sent' | 'delivered' | 'read';
    replyTo?: string;
}

export interface Conversation {
    _id: string;
    type: 'direct' | 'group';
    participants: string[];
    lastMessage?: Message;
    updatedAt: number;
    unreadCount?: number;
    name?: string;
    avatarUrl?: string;
}

export interface SendMessageRequest {
    conversationId: string;
    content: string;
    type: 'text' | 'image' | 'video' | 'file' | 'emoji';
    mediaUrl?: string;
    replyTo?: string;
}

export interface TypingEvent {
    conversationId: string;
    userId: string;
    isTyping: boolean;
}

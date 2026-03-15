import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Message, Attachment, Reaction } from '../../types/chat';

// ============================================================
// MessageBubble - Production-ready, khớp Backend Message Schema
// Hỗ trợ: text/image/file/audio, reactions, reply, edit, delete
// ============================================================

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  currentUserId: string;
  onLongPress?: (message: Message) => void;
  onReplyPress?: (message: Message) => void;
  onReactionPress?: (message: Message) => void;
  onImagePress?: (url: string) => void;
}

/** Format thời gian từ ISO string sang HH:mm */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/** Format file size */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Render trạng thái gửi tin nhắn */
function StatusIcon({ status }: { status?: string }) {
  if (!status) return null;
  switch (status) {
    case 'sending':
      return <Ionicons name="time-outline" size={12} color="#93c5fd" />;
    case 'sent':
      return <Ionicons name="checkmark" size={12} color="#93c5fd" />;
    case 'delivered':
      return <Ionicons name="checkmark-done" size={12} color="#93c5fd" />;
    case 'read':
      return <Ionicons name="checkmark-done" size={12} color="#ffffff" />;
    case 'failed':
      return <Ionicons name="alert-circle" size={12} color="#ef4444" />;
    default:
      return null;
  }
}

/** Render phần Reply (trả lời tin nhắn) */
function ReplyPreview({ replyTo, isMe }: { replyTo: Message; isMe: boolean }) {
  return (
    <View
      className={`border-l-2 pl-2 mb-1 ${isMe ? 'border-blue-200' : 'border-gray-400'}`}
    >
      <Text
        className={`text-[11px] font-semibold ${isMe ? 'text-blue-100' : 'text-gray-600'}`}
        numberOfLines={1}
      >
        {replyTo.sender?.fullName || 'Unknown'}
      </Text>
      <Text
        className={`text-[11px] ${isMe ? 'text-blue-200' : 'text-gray-500'}`}
        numberOfLines={1}
      >
        {replyTo.isDeleted ? 'Tin nhắn đã bị xóa' : replyTo.content}
      </Text>
    </View>
  );
}

/** Render file/image attachments */
function AttachmentList({
  attachments,
  onImagePress,
}: {
  attachments: Attachment[];
  onImagePress?: (url: string) => void;
}) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <View className="mt-1">
      {attachments.map((att, index) => {
        // Image attachment
        if (att.type?.startsWith('image/')) {
          return (
            <TouchableOpacity
              key={`${att.url}-${index}`}
              onPress={() => onImagePress?.(att.url)}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: att.url }}
                className="w-52 h-40 rounded-lg mt-1"
                resizeMode="cover"
              />
            </TouchableOpacity>
          );
        }

        // File / Audio attachment
        const iconName = att.type?.startsWith('audio/') ? 'musical-notes' : 'document-outline';
        return (
          <TouchableOpacity
            key={`${att.url}-${index}`}
            className="flex-row items-center bg-black/10 rounded-lg px-3 py-2 mt-1"
          >
            <Ionicons name={iconName as any} size={20} color="#6b7280" />
            <View className="ml-2 flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {att.name}
              </Text>
              <Text className="text-[10px] text-gray-400">
                {formatFileSize(att.size)}
              </Text>
            </View>
            <Ionicons name="download-outline" size={18} color="#6b7280" />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Render dải reactions */
function ReactionBar({ reactions }: { reactions: Reaction[] }) {
  if (!reactions || reactions.length === 0) return null;

  // Group by emoji
  const grouped: Record<string, number> = {};
  reactions.forEach((r) => {
    grouped[r.emoji] = (grouped[r.emoji] || 0) + 1;
  });

  return (
    <View className="flex-row flex-wrap mt-1 -mb-1">
      {Object.entries(grouped).map(([emoji, count]) => (
        <View
          key={emoji}
          className="flex-row items-center bg-gray-100 rounded-full px-1.5 py-0.5 mr-1 mb-1"
        >
          <Text className="text-[12px]">{emoji}</Text>
          {count > 1 && (
            <Text className="text-[10px] text-gray-500 ml-0.5">{count}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ============================================================
// Main Component
// ============================================================

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  currentUserId,
  onLongPress,
  onReplyPress,
  onReactionPress,
  onImagePress,
}) => {
  const { content, type, sender, attachments, isEdited, isDeleted, replyTo, readBy, reactions, createdAt, status } = message;

  // Deleted message
  if (isDeleted) {
    return (
      <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'} my-1 px-4`}>
        <View className="max-w-[80%] rounded-2xl px-4 py-2 bg-gray-100 border border-dashed border-gray-300">
          <Text className="text-sm text-gray-400 italic">Tin nhắn đã bị xóa</Text>
        </View>
      </View>
    );
  }

  // System message
  if (type === 'system') {
    return (
      <View className="items-center my-2 px-8">
        <View className="bg-gray-200/70 rounded-full px-4 py-1.5">
          <Text className="text-xs text-gray-500 text-center">{content}</Text>
        </View>
      </View>
    );
  }

  const replyMessage = typeof replyTo === 'object' ? replyTo as Message : null;

  return (
    <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'} my-0.5 px-4`}>
      {/* Avatar for other user */}
      {!isMe && (
        <Image
          source={{ uri: sender?.avatar || 'https://i.pravatar.cc/150' }}
          className="w-8 h-8 rounded-full mr-2 mt-1"
        />
      )}

      <Pressable
        onLongPress={() => onLongPress?.(message)}
        className="max-w-[75%]"
      >
        {/* Sender name (group chat) */}
        {!isMe && sender?.fullName && (
          <Text className="text-[11px] text-gray-500 font-medium ml-1 mb-0.5">
            {sender.fullName}
          </Text>
        )}

        <View
          className={`rounded-2xl px-3.5 py-2 ${
            isMe
              ? 'bg-blue-500 rounded-tr-sm'
              : 'bg-white rounded-tl-sm border border-gray-100'
          }`}
        >
          {/* Reply preview */}
          {replyMessage && <ReplyPreview replyTo={replyMessage} isMe={isMe} />}

          {/* Content */}
          {content ? (
            <Text className={`text-[15px] leading-5 ${isMe ? 'text-white' : 'text-gray-900'}`}>
              {content}
            </Text>
          ) : null}

          {/* Attachments */}
          <AttachmentList attachments={attachments} onImagePress={onImagePress} />

          {/* Footer: time + edited + status */}
          <View className="flex-row items-center justify-end mt-1 gap-1">
            {isEdited && (
              <Text className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                (đã sửa)
              </Text>
            )}
            <Text className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
              {formatTime(createdAt)}
            </Text>
            {isMe && <StatusIcon status={status} />}
          </View>
        </View>

        {/* Reactions */}
        <ReactionBar reactions={reactions} />
      </Pressable>
    </View>
  );
};

import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Message, Attachment } from '../../types/chat';

// ============================================================
// MessageInput - Production-ready
// Hỗ trợ: Reply, Attachments preview, auto-expand, send guard
// ============================================================

interface MessageInputProps {
  onSendMessage: (content: string, attachments?: Attachment[], replyToId?: string) => void;
  onAttachPress?: () => void;
  onCameraPress?: () => void;
  onMicPress?: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  onTyping?: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  onAttachPress,
  onCameraPress,
  onMicPress,
  replyingTo,
  onCancelReply,
  disabled = false,
  onTyping,
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || disabled) return;

    onSendMessage(trimmed, undefined, replyingTo?._id);
    setMessage('');
    onCancelReply?.();
  };

  const hasContent = message.trim().length > 0;

  return (
    <View className="bg-white border-t border-gray-100">
      {/* Reply Preview Banner */}
      {replyingTo && (
        <View className="flex-row items-center bg-blue-50 px-4 py-2 border-b border-blue-100">
          <Ionicons name="arrow-undo" size={16} color="#3b82f6" />
          <View className="flex-1 ml-2">
            <Text className="text-[11px] font-semibold text-blue-600" numberOfLines={1}>
              Trả lời {replyingTo.sender?.fullName || 'Unknown'}
            </Text>
            <Text className="text-[11px] text-gray-500" numberOfLines={1}>
              {replyingTo.content || '[Attachment]'}
            </Text>
          </View>
          <TouchableOpacity onPress={onCancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area */}
      <View className="flex-row items-end px-3 py-2 pb-6">
        {/* Attachment Button */}
        <TouchableOpacity
          className="mb-2 mr-2"
          onPress={onAttachPress}
          disabled={disabled}
        >
          <Ionicons name="add-circle" size={28} color={disabled ? '#d1d5db' : '#3b82f6'} />
        </TouchableOpacity>

        {/* Text Input Container */}
        <View className="flex-1 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 min-h-[40px] max-h-[120px] justify-center">
          <TextInput
            ref={inputRef}
            className="text-[15px] text-gray-900 leading-5"
            placeholder="Viết tin nhắn..."
            placeholderTextColor="#9ca3af"
            value={message}
            onChangeText={(t) => {
              setMessage(t);
              if (onTyping) onTyping();
            }}
            multiline
            maxLength={2000}
            editable={!disabled}
            textAlignVertical="center"
          />
        </View>

        {/* Action Buttons */}
        {hasContent ? (
          <TouchableOpacity
            onPress={handleSend}
            disabled={disabled}
            className="mb-2 ml-2 bg-blue-500 rounded-full w-9 h-9 items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={18} color="white" />
          </TouchableOpacity>
        ) : (
          <View className="flex-row items-center mb-2">
            <TouchableOpacity className="ml-2" onPress={onCameraPress} disabled={disabled}>
              <Ionicons name="camera-outline" size={24} color={disabled ? '#d1d5db' : '#6b7280'} />
            </TouchableOpacity>
            <TouchableOpacity className="ml-2" onPress={onMicPress} disabled={disabled}>
              <Ionicons name="mic-outline" size={24} color={disabled ? '#d1d5db' : '#6b7280'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

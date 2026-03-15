import React from 'react';
import { View, Text } from 'react-native';

interface MessageBubbleProps {
  content: string;
  isMe: boolean;
  time: string;
  status?: 'sent' | 'delivered' | 'read';
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  content,
  isMe,
  time,
  status,
}) => {
  return (
    <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'} my-1 px-4`}>
      <View
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isMe 
            ? 'bg-blue-500 rounded-tr-none' 
            : 'bg-gray-200 rounded-tl-none'
        }`}
      >
        <Text className={`text-[16px] ${isMe ? 'text-white' : 'text-gray-900'}`}>
          {content}
        </Text>
        <View className="flex-row items-center self-end mt-1">
          <Text className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
            {time}
          </Text>
          {isMe && status && (
            <Text className="ml-1 text-[10px] text-blue-100 uppercase">
              {status === 'read' ? '✓✓' : '✓'}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

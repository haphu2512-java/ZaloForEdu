import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  avatar: string;
  time: string;
  unreadCount?: number;
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  id,
  name,
  lastMessage,
  avatar,
  time,
  unreadCount,
}) => {
  return (
    <Link href={`/chat/${id}`} asChild>
      <TouchableOpacity className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <Image 
          source={{ uri: avatar || 'https://i.pravatar.cc/150' }} 
          className="w-14 h-14 rounded-full mr-4"
        />
        <View className="flex-1 justify-center">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
              {name}
            </Text>
            <Text className="text-sm text-gray-400">
              {time}
            </Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-gray-500 text-sm flex-1 mr-2" numberOfLines={1}>
              {lastMessage}
            </Text>
            {unreadCount && unreadCount > 0 ? (
              <View className="bg-blue-500 rounded-full px-1.5 py-0.5 min-w-[20px] items-center justify-center">
                <Text className="text-white text-xs font-bold">{unreadCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
};

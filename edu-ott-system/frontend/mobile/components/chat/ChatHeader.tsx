import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ============================================================
// ChatHeader - Custom header cho màn hình chat detail
// ============================================================

interface ChatHeaderProps {
  name: string;
  avatar?: string;
  isOnline?: boolean;
  memberCount?: number;
  onBackPress: () => void;
  onCallPress?: () => void;
  onVideoPress?: () => void;
  onInfoPress?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  name,
  avatar,
  isOnline = false,
  memberCount,
  onBackPress,
  onCallPress,
  onVideoPress,
  onInfoPress,
}) => {
  return (
    <View className="flex-row items-center bg-white px-3 py-2 border-b border-gray-100">
      {/* Back button */}
      <TouchableOpacity onPress={onBackPress} className="mr-2 p-1" activeOpacity={0.6}>
        <Ionicons name="chevron-back" size={26} color="#3b82f6" />
      </TouchableOpacity>

      {/* Avatar with online indicator */}
      <View className="relative mr-3">
        <Image
          source={{ uri: avatar || 'https://i.pravatar.cc/150' }}
          className="w-10 h-10 rounded-full"
        />
        {isOnline && (
          <View className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
        )}
      </View>

      {/* Name & status */}
      <View className="flex-1">
        <Text className="text-base font-bold text-gray-900" numberOfLines={1}>
          {name}
        </Text>
        {memberCount ? (
          <Text className="text-xs text-gray-400">{memberCount} thành viên</Text>
        ) : (
          <Text className="text-xs text-gray-400">
            {isOnline ? 'Đang hoạt động' : 'Offline'}
          </Text>
        )}
      </View>

      {/* Action buttons */}
      <View className="flex-row items-center">
        {onCallPress && (
          <TouchableOpacity onPress={onCallPress} className="ml-3" activeOpacity={0.6}>
            <Ionicons name="call-outline" size={22} color="#3b82f6" />
          </TouchableOpacity>
        )}
        {onVideoPress && (
          <TouchableOpacity onPress={onVideoPress} className="ml-3" activeOpacity={0.6}>
            <Ionicons name="videocam-outline" size={24} color="#3b82f6" />
          </TouchableOpacity>
        )}
        {onInfoPress && (
          <TouchableOpacity onPress={onInfoPress} className="ml-3" activeOpacity={0.6}>
            <Ionicons name="ellipsis-vertical" size={22} color="#6b7280" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

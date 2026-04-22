import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import type { UserInfo } from '@/types/chat';

type SuggestionUserRowProps = {
  item: UserInfo;
  brand: string;
  colors: any;
  sentFriendRequestIds: string[];
  getUserId: (user: UserInfo) => string;
  onAddFriend: (userId: string) => void;
};

export default function SuggestionUserRow({
  item,
  brand,
  colors,
  sentFriendRequestIds,
  getUserId,
  onAddFriend,
}: SuggestionUserRowProps) {
  const uid = getUserId(item);
  const isRequestSent = sentFriendRequestIds.includes(uid);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.surface }}>
      <Image
        source={{
          uri:
            item.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username)}&background=0EA5E9&color=fff&size=100&bold=true`,
        }}
        style={{ width: 54, height: 54, borderRadius: 27, marginRight: 14 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>{item.username}</Text>
        <Text style={{ fontSize: 13, color: colors.muted }}>
          {item.phone || item.email || 'Có thể bạn quen'}
        </Text>
      </View>
      <TouchableOpacity
        style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: isRequestSent ? '#9CA3AF' : brand }}
        onPress={() => onAddFriend(uid)}
        disabled={isRequestSent}
      >
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
          {isRequestSent ? 'Đã gửi' : 'Kết bạn'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

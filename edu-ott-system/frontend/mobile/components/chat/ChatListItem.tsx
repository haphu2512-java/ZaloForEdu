import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string | null;
  time: string;
  unreadCount?: number;
  roomModel?: 'Conversation' | 'Class' | 'Group';
}

function getRoomBadge(roomModel?: string): { icon: keyof typeof Ionicons.glyphMap; color: string } | null {
  switch (roomModel) {
    case 'Class':
      return { icon: 'school', color: '#F59E0B' };
    case 'Group':
      return { icon: 'people', color: '#8B5CF6' };
    default:
      return null;
  }
}

export const ChatListItem: React.FC<ChatListItemProps> = ({
  id,
  name,
  lastMessage,
  avatar,
  time,
  unreadCount,
  roomModel,
}) => {
  const router = useRouter();
  const badge = getRoomBadge(roomModel);
  const hasUnread = (unreadCount || 0) > 0;

  const handlePress = () => {
    router.push({
      pathname: '/chat/[id]' as any,
      params: { id, name, avatar: avatar || '', roomModel: roomModel || 'Conversation' },
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, hasUnread && styles.unreadBg]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{
            uri: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff&size=100&bold=true`,
          }}
          style={styles.avatar}
        />
        {badge && (
          <View style={[styles.badgeIcon, { backgroundColor: badge.color }]}>
            <Ionicons name={badge.icon} size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[styles.name, hasUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
            {time}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[styles.message, hasUnread && styles.messageUnread]}
            numberOfLines={1}
          >
            {lastMessage || 'Chưa có tin nhắn'}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>
                {(unreadCount || 0) > 99 ? '99+' : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  unreadBg: { backgroundColor: '#E0F2FE' },

  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  badgeIcon: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '500', color: '#111827', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#9CA3AF' },
  timeUnread: { color: '#007AFF' },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  messageUnread: { color: '#111827', fontWeight: '500' },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

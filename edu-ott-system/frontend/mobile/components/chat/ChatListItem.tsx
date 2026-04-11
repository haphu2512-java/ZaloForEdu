import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
import { useRouter } from 'expo-router';
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
import { Ionicons } from '@expo/vector-icons';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string | null;
  time: string;
  unreadCount?: number;
  roomModel?: 'Conversation' | 'Class' | 'Group';
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
=======
  isOnline?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
  colors?: {
    text: string;
    muted: string;
    tint: string;
    border: string;
    surface: string;
    secondaryBackground: string;
  };
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
  id,
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
  name,
  lastMessage,
  avatar,
  time,
  unreadCount,
  roomModel,
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
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
=======
  isOnline,
  onPress,
  onLongPress,
  colors,
}) => {
  const badge = getRoomBadge(roomModel);
  const hasUnread = (unreadCount || 0) > 0;

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors?.surface || '#fff' },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
            uri: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366F1&color=fff&size=100&bold=true`,
=======
            uri: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0068FF&color=fff&size=100&bold=true`,
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
          }}
          style={styles.avatar}
        />
        {badge && (
          <View style={[styles.badgeIcon, { backgroundColor: badge.color }]}>
            <Ionicons name={badge.icon} size={10} color="#fff" />
          </View>
        )}
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
=======
        {isOnline && <View style={[styles.onlineDot, { borderColor: colors?.surface || '#fff' }]} />}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
            style={[styles.name, hasUnread && styles.nameUnread]}
=======
            style={[
              styles.name,
              { color: colors?.text || '#111827' },
              hasUnread && styles.nameUnread,
            ]}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
            numberOfLines={1}
          >
            {name}
          </Text>
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
          <Text style={[styles.time, hasUnread && styles.timeUnread]}>
=======
          <Text style={[styles.time, { color: colors?.muted || '#8A8A8A' }, hasUnread && styles.timeUnread]}>
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
            {time}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
            style={[styles.message, hasUnread && styles.messageUnread]}
=======
            style={[
              styles.message,
              { color: colors?.muted || '#6B7280' },
              hasUnread && { color: colors?.text || '#111827', fontWeight: '500' },
            ]}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
    backgroundColor: '#fff',
  },
  unreadBg: { backgroundColor: '#E0F2FE' },

  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
=======
  },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#fff',
  },
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
  name: { fontSize: 16, fontWeight: '500', color: '#111827', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#9CA3AF' },
  timeUnread: { color: '#007AFF' },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 14, color: '#6B7280', flex: 1, marginRight: 8 },
  messageUnread: { color: '#111827', fontWeight: '500' },
=======
  name: { fontSize: 16, fontWeight: '500', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#8A8A8A' },
  timeUnread: { color: '#0068FF' },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 14, flex: 1, marginRight: 8 },
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx

  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/components/chat/ChatListItem.tsx
    backgroundColor: '#007AFF',
=======
    backgroundColor: '#FF3B30',
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/components/chat/ChatListItem.tsx
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

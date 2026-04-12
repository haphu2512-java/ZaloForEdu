import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChatListItemProps {
  id: string;
  name: string;
  lastMessage: string;
  avatar?: string | null;
  time: string;
  unreadCount?: number;
  roomModel?: 'Conversation' | 'Class' | 'Group';
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
  name,
  lastMessage,
  avatar,
  time,
  unreadCount,
  roomModel,
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
      activeOpacity={0.7}
    >
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <Image
          source={{
            uri: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0068FF&color=fff&size=100&bold=true`,
          }}
          style={styles.avatar}
        />
        {badge && (
          <View style={[styles.badgeIcon, { backgroundColor: badge.color }]}>
            <Ionicons name={badge.icon} size={10} color="#fff" />
          </View>
        )}
        {isOnline && <View style={[styles.onlineDot, { borderColor: colors?.surface || colors?.background || '#fff' }]} />}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text
            style={[
              styles.name,
              { color: colors?.text || '#111827' },
              hasUnread && styles.nameUnread,
            ]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text style={[styles.time, { color: colors?.muted || '#8A8A8A' }, hasUnread && styles.timeUnread]}>
            {time}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text
            style={[
              styles.message,
              { color: colors?.muted || '#6B7280' },
              hasUnread && { color: colors?.text || '#111827', fontWeight: '500' },
            ]}
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
    borderColor: '#fff', // This fallback is okay but better use a passed prop if needed
  },

  content: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '500', flex: 1, marginRight: 8 },
  nameUnread: { fontWeight: '700' },
  time: { fontSize: 12, color: '#8A8A8A' },
  timeUnread: { color: '#0068FF' },

  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 14, flex: 1, marginRight: 8 },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});

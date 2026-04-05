import { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';
import { useAuth } from '@/context/auth';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

interface ConversationItem {
  id: string;
  _id: string;
  name: string;
  avatar?: string | null;
  lastMessage: string;
  time: string;
  unreadCount: number;
  roomModel: 'Conversation' | 'Class' | 'Group';
}

function formatTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút`;
  if (diffHours < 24) return `${diffHours} giờ`;
  if (diffDays < 7) {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return days[date.getDay()];
  }
  return `${date.getDate()}/${date.getMonth() + 1}`;
}

function getRoomIcon(roomModel: string): { name: keyof typeof Ionicons.glyphMap; color: string } {
  switch (roomModel) {
    case 'Class':
      return { name: 'school', color: '#F59E0B' };
    case 'Group':
      return { name: 'people', color: '#8B5CF6' };
    default:
      return { name: 'person', color: '#3B82F6' };
  }
}

export default function MessagesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetchAPI('/conversations');
      if (res?.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch (error: any) {
      console.log('Failed to fetch conversations:', error.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadConversations();
      setLoading(false);
    };
    init();
  }, [loadConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handlePress = (item: ConversationItem) => {
    router.push({
      pathname: '/chat/[id]' as any,
      params: {
        id: item._id || item.id,
        name: item.name,
        avatar: item.avatar || '',
        roomModel: item.roomModel,
      },
    });
  };

  const renderItem = ({ item }: { item: ConversationItem }) => {
    const roomIcon = getRoomIcon(item.roomModel);
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.chatItem, { backgroundColor: hasUnread ? colors.secondaryBackground : colors.surface }]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        {/* Avatar */}
        <View style={styles.avatarWrapper}>
          <Image
            source={{
              uri: item.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=6366F1&color=fff&size=100&bold=true`,
            }}
            style={styles.avatar}
          />
          {/* Room type badge */}
          <View style={[styles.roomBadge, { backgroundColor: roomIcon.color }]}>
            <Ionicons name={roomIcon.name} size={10} color="#fff" />
          </View>
        </View>

        {/* Content */}
        <View style={styles.chatContent}>
          <View style={styles.chatTopRow}>
            <Text
              style={[
                styles.chatName,
                { color: colors.text, fontWeight: hasUnread ? '700' : '600' },
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <Text style={[styles.chatTime, { color: hasUnread ? colors.tint : colors.muted }]}>
              {formatTime(item.time)}
            </Text>
          </View>
          <View style={styles.chatBottomRow}>
            <Text
              style={[
                styles.chatMessage,
                {
                  color: hasUnread ? colors.text : colors.muted,
                  fontWeight: hasUnread ? '500' : '400',
                },
              ]}
              numberOfLines={1}
            >
              {item.lastMessage || 'Chưa có tin nhắn'}
            </Text>
            {hasUnread && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
                <Text style={styles.unreadText}>
                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.tint} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có cuộc trò chuyện</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Hãy tham gia lớp học hoặc nhóm để bắt đầu trò chuyện
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item._id || item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 80 }} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  avatarWrapper: { position: 'relative', marginRight: 14 },
  avatar: { width: 54, height: 54, borderRadius: 27 },
  roomBadge: {
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

  chatContent: { flex: 1 },
  chatTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, flex: 1, marginRight: 8 },
  chatTime: { fontSize: 12 },
  chatBottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chatMessage: { fontSize: 14, flex: 1, marginRight: 8 },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

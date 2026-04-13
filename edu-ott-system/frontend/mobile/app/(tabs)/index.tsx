import { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getConversations } from '@/utils/messageService';
import { connectSocket, getSocket } from '@/utils/socketService';
import { useAuth } from '@/context/auth';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Conversation } from '@/types/chat';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { updateConversationPreference } from '@/utils/messageService';
import { ChatListItem } from '@/components/chat/ChatListItem';

function formatTime(dateStr?: string | null): string {
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

/** Get display name for a conversation */
function getDisplayName(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'group' && conv.name) return conv.name;
  // For direct chats, show the other participant's username
  const otherUser = conv.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
  return otherUser?.username || 'Cuộc trò chuyện';
}

/** Get display avatar for a conversation */
function getDisplayAvatar(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'group') {
    if (conv.avatarUrl) return conv.avatarUrl;
    const name = conv.name || 'Group';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B5CF6&color=fff&size=100&bold=true`;
  }
  const otherUser = conv.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
  return (
    otherUser?.avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser?.username || 'U')}&background=6366F1&color=fff&size=100&bold=true`
  );
}

function getSenderName(sender: any): string | undefined {
  if (!sender) return undefined;
  if (typeof sender === 'string') return undefined;
  return sender.username;
}

export default function MessagesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async () => {
    try {
      const res = await getConversations(null, 50);
      if (res?.items) {
        setConversations(res.items);
      }
    } catch (error: any) {
      console.log('Failed to fetch conversations:', error.message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let off: (() => void) | null = null;

    const setupSocketForList = async () => {
      const socket = await connectSocket();
      if (!mounted || !socket) return;

      const onConversationUpdated = (payload: any) => {
        const conversationId = payload?.conversationId;
        if (!conversationId) return;
        setConversations((prev) => {
          const idx = prev.findIndex((conv) => conv._id === conversationId || conv.id === conversationId);
          if (idx < 0) {
            void loadConversations();
            return prev;
          }
          const updated = {
            ...prev[idx],
            latestMessage: payload.latestMessage || prev[idx].latestMessage,
            lastMessageAt: payload.latestMessage?.createdAt || new Date().toISOString(),
          };
          const next = [updated, ...prev.filter((_, i) => i !== idx)];
          return next;
        });
      };

      socket.on('conversation_updated', onConversationUpdated);
      off = () => socket.off('conversation_updated', onConversationUpdated);
    };

    void setupSocketForList();
    return () => {
      mounted = false;
      if (off) off();
    };
  }, [loadConversations]);

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

  const router = useRouter();

  const handlePress = (item: Conversation) => {
    router.push(`/chat/${item._id}`);
  };

  const handleLongPress = (item: Conversation) => {
    Alert.alert('Tùy chọn cuộc trò chuyện', 'Chọn thao tác', [
      {
        text: 'Phân loại: Công việc',
        onPress: async () => {
          await updateConversationPreference(item._id, { category: 'work' });
          await loadConversations();
        },
      },
      {
        text: 'Phân loại: Gia đình',
        onPress: async () => {
          await updateConversationPreference(item._id, { category: 'family' });
          await loadConversations();
        },
      },
      {
        text: 'Lưu trữ tin nhắn',
        onPress: async () => {
          try {
            await updateConversationPreference(item._id, { isHidden: true });
            await loadConversations();
            Alert.alert('Đã lưu trữ', 'Bạn có thể xem lại tin nhắn này trong mục Cá nhân > Tin nhắn lưu trữ');
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể lưu trữ tin nhắn');
          }
        },
      },
      {
        text: 'Xóa khỏi danh sách',
        style: 'destructive',
        onPress: async () => {
          await updateConversationPreference(item._id, { isDeleted: true });
          await loadConversations();
        },
      },
      { text: 'Hủy', style: 'cancel' },
    ]);
  };

  const renderItem = ({ item }: { item: Conversation }) => {
    const currentUserId = user?.id || '';
    const displayName = getDisplayName(item, currentUserId);
    const displayAvatar = getDisplayAvatar(item, currentUserId);
    const isGroup = item.type === 'group';
    const latestMsg = item.latestMessage;
    const lastMessageText = latestMsg?.content || 'Chưa có tin nhắn';
    const lastMessageTime = latestMsg?.createdAt || item.lastMessageAt;
    const senderName = getSenderName(latestMsg?.senderId);

    // Check if the other user is online (for direct chats)
    const otherUser = !isGroup
      ? item.participants?.find((p) => (p._id || p.id || '') !== currentUserId)
      : null;
    const isOnline = otherUser?.isOnline;

    return (
      <ChatListItem
        id={item._id}
        name={displayName}
        avatar={displayAvatar}
        lastMessage={senderName && latestMsg ? `${senderName}: ${lastMessageText}` : lastMessageText}
        time={formatTime(lastMessageTime)}
        roomModel={isGroup ? 'Group' : 'Conversation'}
        isOnline={!!isOnline}
        colors={colors}
        onPress={() => handlePress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
        <Ionicons name="chatbubbles-outline" size={48} color={colors.tint} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có cuộc trò chuyện</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Hãy thêm bạn bè để bắt đầu trò chuyện
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
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={conversations.length === 0 ? { flex: 1 } : undefined}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10, backgroundColor: colors.background }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});

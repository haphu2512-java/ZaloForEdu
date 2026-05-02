import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  FlatList,
  View,
  Text,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { getConversations } from '@/utils/messageService';
import { connectSocket } from '@/utils/socketService';
import { useAuth } from '@/context/auth';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { Conversation } from '@/types/chat';
import { useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { updateConversationPreference, pinConversation, muteConversation, reportConversation } from '@/utils/messageService';
import { blockOrUnblockUser } from '@/utils/userService';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { useBadge } from '@/context/badge';

type FilterTab = 'all' | 'work' | 'family';

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

function getDisplayName(conv: Conversation, currentUserId: string): string {
  if (conv.type === 'group' && conv.name) return conv.name;
  const otherUser = conv.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
  return otherUser?.username || 'Cuộc trò chuyện';
}

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

const TABS: { key: FilterTab; label: string; icon: any }[] = [
  { key: 'all', label: 'Tất cả', icon: 'chatbubbles-outline' },
  { key: 'work', label: 'Công việc', icon: 'briefcase-outline' },
  { key: 'family', label: 'Gia đình', icon: 'home-outline' },
];

export default function MessagesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const router = useRouter();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const { markMessagesRead } = useBadge();

  const loadConversations = useCallback(async () => {
    // Don't fetch if user is not logged in
    if (!user) {
      console.log('[Conversations] User not logged in, skipping fetch');
      return;
    }
    
    try {
      const res = await getConversations(null, 50);
      if (res?.items) {
        setConversations(res.items);
      }
    } catch (error: any) {
      console.log('Failed to fetch conversations:', error.message);
    }
  }, [user]);

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
          if (idx < 0) { void loadConversations(); return prev; }
          const updated = {
            ...prev[idx],
            latestMessage: payload.latestMessage || prev[idx].latestMessage,
            lastMessageAt: payload.latestMessage?.createdAt || new Date().toISOString(),
          };
          return [updated, ...prev.filter((_, i) => i !== idx)];
        });
      };

      const onMessageSeen = (payload: any) => {
        const msgId = payload?.messageId;
        const uid = payload?.userId;
        if (!msgId || !uid) return;
        setConversations(prev => prev.map(conv => {
          if (conv.latestMessage && (conv.latestMessage._id === msgId || conv.latestMessage.id === msgId)) {
            const currentSeen = conv.latestMessage.seenBy || [];
            const mappedSeen = currentSeen.map((u: any) => typeof u === 'string' ? u : u._id || u.id);
            if (!mappedSeen.includes(uid)) {
              return { ...conv, latestMessage: { ...conv.latestMessage, seenBy: [...currentSeen, uid] } };
            }
          }
          return conv;
        }));
      };

      socket.on('conversation_updated', onConversationUpdated);
      socket.on('message_seen', onMessageSeen);

      off = () => {
        socket.off('conversation_updated', onConversationUpdated);
        socket.off('message_seen', onMessageSeen);
      };
    };

    void setupSocketForList();
    return () => {
      mounted = false;
      if (off) off();
    };
  }, [loadConversations]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const init = async () => {
        // Only show loading if user is logged in
        if (user && conversations.length === 0) setLoading(true);
        await loadConversations();
        if (isActive) setLoading(false);
      };
      init();
      // Reset badge khi vào tab Tin nhắn
      markMessagesRead();
      return () => { isActive = false; };
    }, [loadConversations, user, conversations.length, markMessagesRead])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, [loadConversations]);

  const handlePress = (item: Conversation) => { router.push(`/chat/${item._id}`); };
  const handleLongPress = (item: Conversation) => { setSelectedConversation(item); };
  const closeActionSheet = () => { setSelectedConversation(null); };

  const handleAction = async (actionType: string, item: Conversation) => {
    closeActionSheet();
    try {
      if (actionType === 'work') {
        await updateConversationPreference(item._id, { category: 'work' });
        await loadConversations();
        Alert.alert('✅', 'Đã phân loại Công việc');
      } else if (actionType === 'family') {
        await updateConversationPreference(item._id, { category: 'family' });
        await loadConversations();
        Alert.alert('✅', 'Đã phân loại Gia đình');
      } else if (actionType === 'primary') {
        await updateConversationPreference(item._id, { category: 'primary' });
        await loadConversations();
        Alert.alert('✅', 'Đã chuyển về Tất cả');
      } else if (actionType === 'archive') {
        await updateConversationPreference(item._id, { isHidden: true });
        await loadConversations();
        Alert.alert('Đã lưu trữ', 'Xem lại trong Cá nhân > Tin nhắn lưu trữ');
      } else if (actionType === 'delete') {
        await updateConversationPreference(item._id, { isDeleted: true });
        await loadConversations();
      } else if (actionType === 'details') {
        router.push({ pathname: '/conversation-details', params: { id: item._id } });
      } else if (actionType === 'pin') {
        const isPinned = item.preference?.isPinned;
        await pinConversation(item._id, !isPinned);
        await loadConversations();
        Alert.alert('✅', isPinned ? 'Đã bỏ ghim' : 'Đã ghim');
      } else if (actionType === 'mute') {
        const isMuted = item.preference?.isMuted;
        await muteConversation(item._id, !isMuted);
        await loadConversations();
        Alert.alert('✅', isMuted ? 'Đã bật thông báo' : 'Đã tắt thông báo');
      } else if (actionType === 'report') {
        await reportConversation(item._id, 'Báo cáo vi phạm');
        Alert.alert('✅', 'Đã gửi báo cáo');
      } else if (actionType === 'block') {
        const currentUserId = user?.id || '';
        const otherUser = item.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
        if (otherUser) {
          const targetId = otherUser._id || otherUser.id || '';
          await blockOrUnblockUser(targetId, 'block');
          await loadConversations();
          Alert.alert('✅', 'Đã chặn người dùng');
        }
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Thao tác thất bại');
    }
  };

  // Filter conversations based on active tab and sort them with pinned on top
  const filteredConversations = useMemo(() => {
    return [...conversations.filter((conv) => {
      if (activeTab === 'all') return true;
      return conv.preference?.category === activeTab;
    })].sort((a, b) => {
      if (a.preference?.isPinned && !b.preference?.isPinned) return -1;
      if (!a.preference?.isPinned && b.preference?.isPinned) return 1;
      const timeA = new Date(a.latestMessage?.createdAt || a.lastMessageAt || 0).getTime();
      const timeB = new Date(b.latestMessage?.createdAt || b.lastMessageAt || 0).getTime();
      return timeB - timeA;
    });
  }, [conversations, activeTab]);

  // Calculate Strangers vs Normal
  const currentUserFriends = useMemo(() => (user?.friends || []).map((f: any) => typeof f === 'string' ? f : f._id || f.id), [user]);
  
  const strangerConversations = useMemo(() => filteredConversations.filter(conv => {
    if (conv.type === 'group') return false;
    const other = conv.participants?.find((p) => (p._id || p.id || '') !== (user?.id || ''));
    if (!other) return false;
    const targetId = other._id || other.id || '';
    return !currentUserFriends.includes(targetId);
  }), [filteredConversations, user?.id, currentUserFriends]);

  const normalConversations = useMemo(() => filteredConversations.filter(c => !strangerConversations.includes(c)), [filteredConversations, strangerConversations]);

  const renderItem = ({ item }: { item: Conversation }) => {
    const currentUserId = user?.id || '';
    const displayName = getDisplayName(item, currentUserId);
    const displayAvatar = getDisplayAvatar(item, currentUserId);
    const isGroup = item.type === 'group';
    const latestMsg = item.latestMessage;
    const lastMessageText = latestMsg?.content || 'Chưa có tin nhắn';
    const lastMessageTime = latestMsg?.createdAt || item.lastMessageAt;
    const senderName = getSenderName(latestMsg?.senderId);
    const otherUser = !isGroup ? item.participants?.find((p) => (p._id || p.id || '') !== (user?.id || '')) : null;
    const isOnline = otherUser?.isOnline;

    // Check if the latest message is unread by the current user
    let isUnread = false;
    if (latestMsg) {
      const msgSenderId = typeof latestMsg.senderId === 'string' ? latestMsg.senderId : (latestMsg.senderId as any)?._id || (latestMsg.senderId as any)?.id;
      if (msgSenderId && msgSenderId !== currentUserId) {
        const seenByList = (latestMsg.seenBy || []).map((u: any) => typeof u === 'string' ? u : (u as any)?._id || (u as any)?.id);
        if (!seenByList.includes(currentUserId)) {
          isUnread = true;
        }
      }
    }

    // Category badge color
    const catColor = item.preference?.category === 'work' ? '#F59E0B' : item.preference?.category === 'family' ? '#10B981' : null;

    return (
      <ChatListItem
        id={item._id}
        name={displayName}
        isPinned={item.preference?.isPinned}
        avatar={displayAvatar}
        lastMessage={senderName && latestMsg ? `${senderName}: ${lastMessageText}` : lastMessageText}
        time={formatTime(lastMessageTime)}
        unreadCount={isUnread ? 1 : 0}
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
        <Ionicons name={activeTab === 'all' ? 'chatbubbles-outline' : activeTab === 'work' ? 'briefcase-outline' : 'home-outline'} size={48} color={colors.tint} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {activeTab === 'all' ? 'Chưa có cuộc trò chuyện' : `Không có tin nhắn ${activeTab === 'work' ? 'Công việc' : 'Gia đình'}`}
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {activeTab === 'all' ? 'Hãy thêm bạn bè để bắt đầu trò chuyện' : 'Nhấn giữ vào tin nhắn để phân loại'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category Filter Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tab.key === 'all'
            ? conversations.length
            : conversations.filter((c) => c.preference?.category === tab.key).length;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, isActive && { borderBottomColor: colors.tint, borderBottomWidth: 2 }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.tint : colors.muted} />
              <Text style={[styles.tabLabel, { color: isActive ? colors.tint : colors.muted }]}>{tab.label}</Text>
              {count > 0 && (
                <View style={[styles.tabBadge, { backgroundColor: isActive ? colors.tint : colors.muted }]}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={normalConversations}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        contentContainerStyle={filteredConversations.length === 0 ? { flex: 1 } : undefined}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: colors.border, marginLeft: 76 }} />}
        ListHeaderComponent={strangerConversations.length > 0 && activeTab === 'all' ? (
          <TouchableOpacity onPress={() => router.push('/strangers')} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#0068FF', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <MaterialCommunityIcons name="incognito" size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500', color: colors.text }}>Tin nhắn từ người lạ</Text>
              <Text style={{ fontSize: 14, color: colors.muted, marginTop: 2 }}>Gửi từ người chưa có trong danh bạ</Text>
            </View>
            {strangerConversations.some(c => c.latestMessage && c.latestMessage.senderId !== user?.id && !c.latestMessage.seenBy?.some((s: any) => (s._id || s.id || s) === user?.id)) && (
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginLeft: 8 }} />
            )}
          </TouchableOpacity>
        ) : null}
      />

      {/* Action Sheet Modal */}
      <Modal
        visible={!!selectedConversation}
        transparent={true}
        animationType="slide"
        onRequestClose={closeActionSheet}
      >
        <TouchableWithoutFeedback onPress={closeActionSheet}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.actionSheet, { backgroundColor: colors.background }]}>
                {/* Handle bar */}
                <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border }} />
                </View>
                <View style={styles.actionSheetHeader}>
                  <Text style={[styles.actionSheetTitle, { color: colors.text }]}>Tùy chọn</Text>
                </View>

                {selectedConversation && (
                  <View style={styles.actionSheetOptions}>
                    {selectedConversation.preference?.category !== 'work' && (
                      <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('work', selectedConversation)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: '#FEF3C7' }]}>
                          <Ionicons name="briefcase-outline" size={20} color="#D97706" />
                        </View>
                        <Text style={[styles.actionOptionText, { color: colors.text }]}>Phân loại: Công việc</Text>
                      </TouchableOpacity>
                    )}
                    {selectedConversation.preference?.category !== 'family' && (
                      <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('family', selectedConversation)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: '#DCFCE7' }]}>
                          <Ionicons name="home-outline" size={20} color="#16A34A" />
                        </View>
                        <Text style={[styles.actionOptionText, { color: colors.text }]}>Phân loại: Gia đình</Text>
                      </TouchableOpacity>
                    )}
                    {selectedConversation.preference?.category && selectedConversation.preference.category !== 'primary' && (
                      <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('primary', selectedConversation)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: '#E0E7FF' }]}>
                          <Ionicons name="chatbubbles-outline" size={20} color="#4F46E5" />
                        </View>
                        <Text style={[styles.actionOptionText, { color: colors.text }]}>Chuyển về Tất cả</Text>
                      </TouchableOpacity>
                    )}
                    {selectedConversation.type === 'group' && (
                      <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('details', selectedConversation)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: '#E0F2FE' }]}>
                          <Ionicons name="settings-outline" size={20} color="#0284C7" />
                        </View>
                        <Text style={[styles.actionOptionText, { color: colors.text }]}>Quản lý nhóm</Text>
                      </TouchableOpacity>
                    )}

                    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 4, marginHorizontal: 16 }} />

                    <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('pin', selectedConversation)}>
                      <View style={[styles.actionIconWrap, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="pin" size={22} color={colors.text} />
                      </View>
                      <Text style={[styles.actionOptionText, { color: colors.text }]}>Ghim</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('archive', selectedConversation)}>
                      <View style={[styles.actionIconWrap, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="archive-outline" size={22} color={colors.text} />
                      </View>
                      <Text style={[styles.actionOptionText, { color: colors.text }]}>Lưu trữ</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('mute', selectedConversation)}>
                      <View style={[styles.actionIconWrap, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="notifications-off-outline" size={22} color={colors.text} />
                      </View>
                      <Text style={[styles.actionOptionText, { color: colors.text }]}>Tắt tiếng</Text>
                    </TouchableOpacity>

                    {selectedConversation.type !== 'group' && (
                      <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('block', selectedConversation)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'transparent' }]}>
                          <Ionicons name="ban-outline" size={22} color={colors.text} />
                        </View>
                        <Text style={[styles.actionOptionText, { color: colors.text }]}>Chặn</Text>
                      </TouchableOpacity>
                    )}

                    {selectedConversation.type !== 'group' && (
                      <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('report', selectedConversation)}>
                        <View style={[styles.actionIconWrap, { backgroundColor: 'transparent' }]}>
                          <Ionicons name="flag-outline" size={22} color={colors.text} />
                        </View>
                        <Text style={[styles.actionOptionText, { color: colors.text }]}>Báo cáo</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionOption} onPress={() => handleAction('delete', selectedConversation)}>
                      <View style={[styles.actionIconWrap, { backgroundColor: 'transparent' }]}>
                        <Ionicons name="trash-outline" size={22} color="#EF4444" />
                      </View>
                      <Text style={[styles.actionOptionText, { color: '#EF4444' }]}>Xóa</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actionOption, { paddingVertical: 16, justifyContent: 'center' }]} onPress={closeActionSheet}>
                      <Text style={[{ color: colors.muted, textAlign: 'center', width: '100%', fontSize: 16, fontWeight: '700' }]}>Hủy</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Tabs
  tabBar: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 11, gap: 5, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabLabel: { fontSize: 13, fontWeight: '600' },
  tabBadge: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, minWidth: 18, alignItems: 'center' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)', justifyContent: 'flex-end' },
  actionSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 8 },
  actionSheetHeader: { paddingHorizontal: 16, paddingVertical: 10 },
  actionSheetTitle: { fontSize: 16, fontWeight: '700' },
  actionSheetOptions: {},
  actionOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, gap: 14 },
  actionIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actionOptionText: { fontSize: 15, fontWeight: '500' },
});

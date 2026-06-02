import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCommunityStore } from '@/stores/communityStore';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import type { Community } from '@/types/community';

const getMessagePreview = (item: any): string => {
  if (!item?.latestMessage) return 'Chưa có tin nhắn';
  const msg = item.latestMessage;
  if (msg.type === 'announcement') return '📢 Thông báo mới';
  if (msg.content?.startsWith('[sticker]')) return '[Nhãn dán]';
  if (msg.content?.trim()) return msg.content.trim();
  if (msg.mediaIds && msg.mediaIds.length > 0) return '🖼️ Hình ảnh/Video';
  if (msg.attachments && msg.attachments.length > 0) return '📎 Tệp đính kèm';
  if (msg.type === 'image' || msg.type === 'video') return '🖼️ Hình ảnh/Video';
  if (msg.type === 'file') return '📎 Tệp đính kèm';
  return 'Tin nhắn mới';
};

const getTimeAgo = (date?: string | null): string => {
  if (!date) return '';
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ`;
  return `${Math.floor(hrs / 24)} ngày`;
};

export default function CommunityListScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const brand = '#1D67FF';

  const [keyword, setKeyword] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const { communities, unreadByCommunity, loading, loadCommunities, connectRealtime } = useCommunityStore();

  useEffect(() => {
    loadCommunities();
    connectRealtime();
  }, [loadCommunities, connectRealtime]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCommunities();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c: any) => (c.name || '').toLowerCase().includes(q));
  }, [communities, keyword]);

  const renderItem = ({ item }: { item: Community }) => {
    const unread = unreadByCommunity[item._id] || item.unreadCount || 0;
    const preview = getMessagePreview(item);
    const timeStr = getTimeAgo((item as any).latestMessage?.createdAt || (item as any).lastMessageAt);
    const avatarUrl =
      item.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'C')}&background=1D67FF&color=fff&size=100&bold=true`;

    return (
      <TouchableOpacity
        style={[styles.row, { borderBottomColor: colors.border }]}
        onPress={() => router.push({ pathname: '/community/[id]', params: { id: item._id } })}
        activeOpacity={0.75}
      >
        <View style={styles.avatarWrap}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          {/* Online dot / online indicator for communities is not required, but keep space */}
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.rowHead}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {timeStr ? <Text style={[styles.time, { color: colors.muted }]}>{timeStr}</Text> : null}
          </View>
          <Text style={[styles.preview, { color: unread > 0 ? colors.text : colors.muted }]} numberOfLines={1}>
            {preview}
          </Text>
        </View>
        {unread > 0 ? (
          <View style={[styles.badge, { backgroundColor: brand }]}>
            <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Cộng đồng</Text>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: brand }]}
          onPress={() => router.push('/community/create')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.createBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: colorScheme === 'dark' ? '#1F2937' : '#F3F4F6' }]}>
          <Ionicons name="search-outline" size={16} color={colors.muted} />
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder="Tìm cộng đồng..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {keyword.length > 0 && (
            <TouchableOpacity onPress={() => setKeyword('')}>
              <Ionicons name="close-circle" size={16} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading && communities.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={brand} />}
          ItemSeparatorComponent={null}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={[styles.emptyIcon, { backgroundColor: brand + '15' }]}>
                <Ionicons name="people" size={48} color={brand} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {keyword ? 'Không tìm thấy kết quả' : 'Chưa có cộng đồng nào'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                {keyword ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo cộng đồng đầu tiên của bạn ngay!'}
              </Text>
              {!keyword && (
                <TouchableOpacity
                  style={[styles.createBtnLarge, { backgroundColor: brand }]}
                  onPress={() => router.push('/community/create')}
                >
                  <Ionicons name="sparkles" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.createBtnText}>Tạo cộng đồng</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 22, fontWeight: '800' },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Search
  searchWrap: { paddingHorizontal: 16, paddingVertical: 10 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
  },
  searchInput: { flex: 1, fontSize: 14 },

  // Row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: 'relative' },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  name: { fontSize: 15, fontWeight: '700', flex: 1, marginRight: 6 },
  time: { fontSize: 11 },
  preview: { fontSize: 13, lineHeight: 18 },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  // Empty / Loading
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  createBtnLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 24,
    marginTop: 8,
  },
});

import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useCommunityStore } from '@/stores/communityStore';

const getMessagePreview = (item: any) => {
  if (!item?.latestMessage) return 'Chưa có tin nhắn';
  if (item.latestMessage.type === 'announcement') return '📢 Thông báo mới';
  if (item.latestMessage.content?.trim()) return item.latestMessage.content;
  if (item.latestMessage.type === 'image') return '🖼️ Hình ảnh';
  if (item.latestMessage.type === 'file') return '📎 Tệp đính kèm';
  return 'Tin nhắn mới';
};

export default function CommunityListScreen() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');

  const { communities, unreadByCommunity, loadCommunities, connectRealtime } = useCommunityStore();

  useEffect(() => {
    loadCommunities();
    connectRealtime();
  }, [loadCommunities, connectRealtime]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return communities;
    return communities.filter((c: any) => (c.name || '').toLowerCase().includes(q));
  }, [communities, keyword]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cộng đồng</Text>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color="#6B7280" />
        <TextInput
          value={keyword}
          onChangeText={setKeyword}
          placeholder="Tìm cộng đồng..."
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => {
          const unread = unreadByCommunity[item._id] || item.unreadCount || 0;
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push({ pathname: '/community/[id]', params: { id: item._id } })}
            >
              <Image
                source={{
                  uri:
                    item.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name || 'C')}&background=1D67FF&color=fff`,
                }}
                style={styles.avatar}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.preview} numberOfLines={1}>
                  {getMessagePreview(item)}
                </Text>
              </View>
              {unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      <TouchableOpacity style={styles.fab} onPress={() => router.push('/community/create')}>
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.fabText}>Create Community</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', paddingHorizontal: 16, marginBottom: 12 },
  searchBox: {
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingLeft: 8, fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  name: { fontSize: 16, fontWeight: '600', color: '#111827' },
  preview: { marginTop: 3, fontSize: 13, color: '#6B7280' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#1D67FF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    backgroundColor: '#1D67FF',
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#1D67FF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

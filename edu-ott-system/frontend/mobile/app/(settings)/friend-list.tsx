import React, { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StyleSheet,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getFriendList, removeFriend } from '@/utils/friendService';
import { createConversation } from '@/utils/messageService';
import type { UserInfo } from '@/types/chat';

export default function FriendListScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const res = await getFriendList(null, 100);
      setFriends(res.items || []);
    } catch (error: any) {
      console.log('Failed to fetch friends:', error.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const init = async () => {
        if (friends.length === 0) setLoading(true);
        await loadFriends();
        if (isActive) setLoading(false);
      };
      init();
      return () => {
        isActive = false;
      };
    }, [loadFriends])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFriends();
    setRefreshing(false);
  }, [loadFriends]);

  const handleRemoveFriend = (friend: UserInfo) => {
    const fid = friend._id || friend.id;
    if (!fid) return;

    Alert.alert(
      'Hủy kết bạn',
      `Bạn có chắc muốn hủy kết bạn với ${friend.username}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Hủy kết bạn',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(fid);
            try {
              await removeFriend(fid);
              setFriends((prev) => prev.filter((f) => (f._id || f.id) !== fid));
              Alert.alert('Thành công', `Đã hủy kết bạn với ${friend.username}`);
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể hủy kết bạn');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleStartChat = async (friend: UserInfo) => {
    const fid = friend._id || friend.id;
    if (!fid) return;

    try {
      const conv = await createConversation({
        type: 'direct',
        participantIds: [fid]
      });
      const convId = conv._id || conv.id;
      router.push(`/chat/${convId}`);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể bắt đầu trò chuyện');
    }
  };

  const filteredFriends = friends.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderItem = ({ item }: { item: UserInfo }) => {
    const uid = item._id || item.id;
    const isProcessing = processingId === uid;
    const avatarUri =
      item.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username || 'U')}&background=6366F1&color=fff&size=100&bold=true`;

    return (
      <TouchableOpacity
        style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleStartChat(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userCardLeft}>
          <View style={styles.avatarWrapper}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
            {item.isOnline && (
              <View style={[styles.onlineIndicator, { borderColor: colors.surface }]} />
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.username, { color: colors.text }]}>{item.username || 'Người dùng'}</Text>
            <Text style={[styles.userStatus, { color: item.isOnline ? '#10B981' : colors.muted }]}>
              {item.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: colors.tint + '10' }]}
            onPress={() => handleStartChat(item)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIcon, { backgroundColor: '#FEE2E2' }]}
            onPress={() => handleRemoveFriend(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Ionicons name="person-remove-outline" size={20} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
        <Ionicons name="people-outline" size={48} color={colors.tint} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có bạn bè</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Hãy kết nối với mọi người để bắt đầu trò chuyện!
      </Text>
      <TouchableOpacity
        style={[styles.findBtn, { backgroundColor: colors.tint }]}
        onPress={() => router.push('/(tabs)/contacts')}
      >
        <Text style={styles.findBtnText}>Tìm bạn mới</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: 'Danh sách bạn bè',
          headerShown: true,
          headerStyle: {
            backgroundColor: colorScheme === 'dark' ? colors.surface : colors.tint,
          },
          headerTintColor: colorScheme === 'dark' ? colors.text : '#fff',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '700',
            color: colorScheme === 'dark' ? colors.text : '#fff',
          },
        }}
      />

      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          placeholder="Tìm kiếm bạn bè..."
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.text }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFriends}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
          }
          contentContainerStyle={[
            styles.listContent,
            filteredFriends.length === 0 ? { flex: 1 } : undefined,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 4 },

  listContent: { padding: 16 },

  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  userCardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 14,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  userInfo: { flex: 1 },
  username: { fontSize: 16, fontWeight: '700' },
  userStatus: { fontSize: 12, marginTop: 2, fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 8 },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 96, height: 96, borderRadius: 48,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, color: '#64748B' },

  findBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  findBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

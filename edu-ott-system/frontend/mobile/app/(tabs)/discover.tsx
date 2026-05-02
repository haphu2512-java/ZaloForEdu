import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/auth';
import PostCard from '@/components/social/PostCard';
import { getFeed, toggleReaction, deletePost } from '@/utils/socialService';
import { useBadge } from '@/context/badge';

export default function FeedScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const router = useRouter();
  const { markNotificationsRead } = useBadge();

  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const currentUserId = user?.id || '';

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (!user) return;
    try {
      const res = await getFeed(isRefresh ? null : null, 15);
      setPosts(res?.items || []);
      setCursor(res?.nextCursor || null);
      setHasMore(!!res?.hasMore);
    } catch (err: any) {
      console.log('Feed load error:', err.message);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const init = async () => {
        if (posts.length === 0) setLoading(true);
        await loadFeed(true);
        if (active) setLoading(false);
      };
      init();
      // Reset notification badge khi vào tab Nhật ký
      markNotificationsRead();
      return () => { active = false; };
    }, [loadFeed, markNotificationsRead])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed(true);
    setRefreshing(false);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await getFeed(cursor, 15);
      setPosts((prev) => [...prev, ...(res?.items || [])]);
      setCursor(res?.nextCursor || null);
      setHasMore(!!res?.hasMore);
    } catch (err: any) {
      console.log('Load more error:', err.message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReact = async (postId: string, emoji: string | null) => {
    // Optimistic update
    setPosts((prev) =>
      prev.map((p) => {
        if ((p._id || p.id) !== postId) return p;
        const hadReaction = !!p.myReaction;
        const newCount = emoji
          ? (hadReaction ? p.reactionsCount : p.reactionsCount + 1)
          : Math.max(0, p.reactionsCount - 1);
        return { ...p, myReaction: emoji, reactionsCount: newCount };
      })
    );
    try {
      await toggleReaction({ targetType: 'post', targetId: postId, emoji });
    } catch {
      await loadFeed(true); // Rollback on error
    }
  };

  const handleDelete = (postId: string) => {
    Alert.alert('Xóa bài viết', 'Bạn có chắc chắn muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deletePost(postId);
            setPosts((prev) => prev.filter((p) => (p._id || p.id) !== postId));
          } catch (err: any) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.tint }]}>
        <Text style={s.headerTitle}>Nhật ký</Text>
        <TouchableOpacity style={s.createBtn} onPress={() => router.push('/(social)/create-post' as any)}>
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || item.id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={currentUserId}
            colors={colors}
            onPress={() => router.push({ pathname: '/(social)/post-detail', params: { postId: item._id || item.id } } as any)}
            onReact={(emoji) => handleReact(item._id || item.id, emoji)}
            onComment={() => router.push({ pathname: '/(social)/post-detail', params: { postId: item._id || item.id, focus: 'comment' } } as any)}
            onShare={() => Alert.alert('Thông báo', 'Tính năng chia sẻ đang phát triển')}
            onAuthorPress={(authorId) => router.push({ pathname: '/(social)/user-profile', params: { userId: authorId } } as any)}
            onDelete={() => handleDelete(item._id || item.id)}
          />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.tint} style={{ padding: 16 }} /> : null}
        ListEmptyComponent={
          <View style={s.empty}>
            <Ionicons name="newspaper-outline" size={64} color={colors.muted} />
            <Text style={[s.emptyText, { color: colors.muted }]}>Chưa có bài viết nào</Text>
            <Text style={[s.emptySubtext, { color: colors.muted }]}>Hãy chia sẻ khoảnh khắc đầu tiên!</Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: colors.tint }]}
              onPress={() => router.push('/(social)/create-post' as any)}
            >
              <Text style={s.emptyBtnText}>Tạo bài viết</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={posts.length === 0 ? { flex: 1 } : undefined}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  createBtn: { padding: 6 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  emptyText: { fontSize: 18, fontWeight: '700', marginTop: 8 },
  emptySubtext: { fontSize: 14, textAlign: 'center' },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 12 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

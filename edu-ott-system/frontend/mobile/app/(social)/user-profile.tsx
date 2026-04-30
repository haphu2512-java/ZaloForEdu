import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Image, ActivityIndicator, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/auth';
import PostCard from '@/components/social/PostCard';
import { getUserPosts, toggleReaction, deletePost } from '@/utils/socialService';
import { fetchAPI } from '@/utils/api';

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.id || '';
  const isSelf = uid === userId;

  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const [userRes, postsRes] = await Promise.all([
          fetchAPI(`/users/${userId}`),
          getUserPosts(userId),
        ]);
        setProfile(userRes?.data || null);
        setPosts(postsRes?.items || []);
      } catch (e: any) { console.log(e.message); }
      finally { setLoading(false); }
    })();
  }, [userId]);

  const handleReact = async (postId: string, emoji: string | null) => {
    setPosts((prev) => prev.map((p) => {
      if (p._id !== postId) return p;
      const had = !!p.myReaction;
      return { ...p, myReaction: emoji, reactionsCount: emoji ? (had ? p.reactionsCount : p.reactionsCount + 1) : Math.max(0, p.reactionsCount - 1) };
    }));
    try { await toggleReaction({ targetType: 'post', targetId: postId, emoji }); } catch { /* reload */ }
  };

  if (loading) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;

  const name = profile?.username || 'Người dùng';
  const avatar = profile?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0068FF&color=fff&size=150&bold=true`;
  const friendCount = profile?.friends?.length || 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: isSelf ? 'Trang cá nhân' : name }} />
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id || item.id}
        ListHeaderComponent={
          <View>
            {/* Cover + Avatar */}
            <View style={[s.coverWrap, { backgroundColor: colors.tint }]}>
              <View style={s.avatarContainer}>
                <Image source={{ uri: avatar }} style={s.avatar} />
              </View>
            </View>

            <View style={s.infoSection}>
              <Text style={[s.name, { color: colors.text }]}>{name}</Text>
              {profile?.email && <Text style={[s.email, { color: colors.muted }]}>{profile.email}</Text>}

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={[s.statNumber, { color: colors.text }]}>{posts.length}</Text>
                  <Text style={[s.statLabel, { color: colors.muted }]}>Bài viết</Text>
                </View>
                <View style={[s.statDivider, { backgroundColor: colors.border }]} />
                <View style={s.statItem}>
                  <Text style={[s.statNumber, { color: colors.text }]}>{friendCount}</Text>
                  <Text style={[s.statLabel, { color: colors.muted }]}>Bạn bè</Text>
                </View>
              </View>

              {isSelf && (
                <TouchableOpacity
                  style={[s.createBtn, { backgroundColor: colors.tint }]}
                  onPress={() => router.push('/(social)/create-post' as any)}
                >
                  <Ionicons name="create-outline" size={18} color="#fff" />
                  <Text style={s.createBtnText}>Tạo bài viết</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <Text style={[s.sectionTitle, { color: colors.text }]}>Bài viết</Text>
          </View>
        }
        renderItem={({ item }) => (
          <PostCard
            post={item}
            currentUserId={uid}
            colors={colors}
            onPress={() => router.push({ pathname: '/(social)/post-detail', params: { postId: item._id } } as any)}
            onReact={(emoji) => handleReact(item._id, emoji)}
            onComment={() => router.push({ pathname: '/(social)/post-detail', params: { postId: item._id } } as any)}
            onAuthorPress={() => {}}
            onDelete={() => Alert.alert('Xóa?', '', [{ text: 'Hủy' }, { text: 'Xóa', style: 'destructive', onPress: async () => { await deletePost(item._id); setPosts((p) => p.filter((x) => x._id !== item._id)); } }])}
          />
        )}
        ListEmptyComponent={<View style={s.empty}><Text style={{ color: colors.muted, fontSize: 15 }}>Chưa có bài viết nào</Text></View>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverWrap: { height: 140, justifyContent: 'flex-end', alignItems: 'center' },
  avatarContainer: { position: 'absolute', bottom: -40 },
  avatar: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, borderColor: '#fff' },
  infoSection: { alignItems: 'center', paddingTop: 48, paddingBottom: 16 },
  name: { fontSize: 22, fontWeight: '800' },
  email: { fontSize: 14, marginTop: 4 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 24 },
  statItem: { alignItems: 'center' },
  statNumber: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 13, marginTop: 2 },
  statDivider: { width: 1, height: 28 },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 24 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  divider: { height: 8, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, paddingVertical: 12 },
  empty: { alignItems: 'center', paddingVertical: 40 },
});

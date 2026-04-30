import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, ActivityIndicator, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, TouchableOpacity
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/auth';
import PostCard from '@/components/social/PostCard';
import CommentItem from '@/components/social/CommentItem';
import CommentInput from '@/components/social/CommentInput';
import { getPostById, getComments, createComment, deleteComment, toggleReaction, deletePost } from '@/utils/socialService';


export default function PostDetailScreen() {
  const { postId } = useLocalSearchParams<{ postId: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const router = useRouter();
  const uid = user?.id || '';
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyTo, setReplyTo] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      try {
        const [p, c] = await Promise.all([getPostById(postId), getComments(postId)]);
        setPost(p);
        setComments(c?.items || []);
      } catch (e: any) { Alert.alert('Lỗi', e.message); }
      finally { setLoading(false); }
    })();
  }, [postId]);

  const handleReact = async (emoji: string | null) => {
    if (!post) return;
    const had = !!post.myReaction;
    setPost((p: any) => ({ ...p, myReaction: emoji, reactionsCount: emoji ? (had ? p.reactionsCount : p.reactionsCount + 1) : Math.max(0, p.reactionsCount - 1) }));
    try { await toggleReaction({ targetType: 'post', targetId: post._id, emoji }); } catch { const p = await getPostById(postId!); setPost(p); }
  };

  const handleAddComment = async (text: string) => {
    if (!postId) return;
    const c = await createComment(postId, { content: text, parentId: replyTo || undefined });
    setComments((prev) => [...prev, c]);
    setPost((p: any) => p ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p);
    setReplyTo(null);
  };

  const handleDeleteComment = (cid: string) => {
    Alert.alert('Xóa', 'Xóa bình luận?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        await deleteComment(postId!, cid);
        setComments((prev) => prev.filter((c) => c._id !== cid));
        setPost((p: any) => p ? { ...p, commentsCount: Math.max(0, (p.commentsCount||0)-1) } : p);
      }},
    ]);
  };

  const { bottom, top } = useSafeAreaInsets();

  if (loading) return <View style={[s.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.tint} /></View>;

  return (
    <KeyboardAvoidingView 
      style={[s.container, { backgroundColor: colors.background }]} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header to fix notch issues */}
      <View style={[s.customHeader, { backgroundColor: colors.surface, paddingTop: top }]}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Bài viết</Text>
          <View style={{ width: 28 }} />
        </View>
      </View>

      <FlatList
        data={comments}
        keyExtractor={(item) => item._id || item.id}
        contentContainerStyle={{ paddingBottom: Math.max(bottom, 16) }}
        ListHeaderComponent={post ? <PostCard post={post} currentUserId={uid} colors={colors} onReact={handleReact} onComment={() => {}} onAuthorPress={(id) => router.push({ pathname: '/(social)/user-profile', params: { userId: id } } as any)} onDelete={() => Alert.alert('Xóa?', '', [{ text: 'Hủy' }, { text: 'Xóa', style: 'destructive', onPress: async () => { await deletePost(post._id); router.back(); } }])} /> : null}
        renderItem={({ item }) => <CommentItem comment={item} currentUserId={uid} colors={colors} onReply={() => setReplyTo(item._id)} onDelete={() => handleDeleteComment(item._id)} onAuthorPress={(id) => router.push({ pathname: '/(social)/user-profile', params: { userId: id } } as any)} />}
        ListEmptyComponent={<View style={s.empty}><Text style={{ color: colors.muted }}>Chưa có bình luận</Text></View>}
      />
      {replyTo && <View style={[s.replyBar, { backgroundColor: colors.secondaryBackground }]}><Text style={{ color: colors.muted, fontSize: 13 }}>Đang trả lời...</Text><Text style={{ color: colors.tint, fontSize: 13, fontWeight: '700' }} onPress={() => setReplyTo(null)}>Hủy</Text></View>}
      
      <View style={{ paddingBottom: Math.max(bottom, 12), backgroundColor: colors.surface }}>
        <CommentInput colors={colors} placeholder={replyTo ? 'Viết phản hồi...' : 'Viết bình luận...'} onSubmit={handleAddComment} />
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', paddingVertical: 32 },
  replyBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  customHeader: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16 },
  headerBtn: { padding: 4, marginLeft: -8 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
});

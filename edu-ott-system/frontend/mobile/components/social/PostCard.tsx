import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const EMOJI_MAP: Record<string, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PostCardProps {
  post: any;
  currentUserId: string;
  colors: any;
  onPress?: () => void;
  onReact?: (emoji: string | null) => void;
  onComment?: () => void;
  onShare?: () => void;
  onAuthorPress?: (authorId: string) => void;
  onDelete?: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function PostCard({
  post,
  currentUserId,
  colors,
  onPress,
  onReact,
  onComment,
  onShare,
  onAuthorPress,
  onDelete,
}: PostCardProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const author = post.authorId || {};
  const authorName = author.username || 'Người dùng';
  const authorAvatar = author.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=0068FF&color=fff&size=100&bold=true`;
  const isOwner = (author._id || author.id) === currentUserId;
  const privacyIcon = post.privacy === 'public' ? 'earth' : post.privacy === 'friends' ? 'people' : 'lock-closed';

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[s.card, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => onAuthorPress?.(author._id || author.id)} style={s.avatarWrap}>
          <Image source={{ uri: authorAvatar }} style={s.avatar} />
        </TouchableOpacity>
        <View style={s.headerInfo}>
          <TouchableOpacity onPress={() => onAuthorPress?.(author._id || author.id)}>
            <Text style={[s.authorName, { color: colors.text }]}>{authorName}</Text>
          </TouchableOpacity>
          <View style={s.metaRow}>
            <Text style={[s.timeText, { color: colors.muted }]}>{timeAgo(post.createdAt)}</Text>
            <Ionicons name={privacyIcon as any} size={12} color={colors.muted} style={{ marginLeft: 6 }} />
            {post.isEdited && <Text style={[s.editedText, { color: colors.muted }]}> · đã chỉnh sửa</Text>}
          </View>
        </View>
        {isOwner && (
          <TouchableOpacity onPress={onDelete} style={s.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {post.content ? (
        <Text style={[s.content, { color: colors.text }]}>{post.content}</Text>
      ) : null}

      {/* Media */}
      {post.mediaUrls?.length > 0 && (
        <View style={s.mediaWrap}>
          {post.mediaUrls.slice(0, 4).map((media: any, idx: number) => (
            <Image
              key={idx}
              source={{ uri: media.url }}
              style={[
                s.mediaImg,
                post.mediaUrls.length === 1
                  ? { width: SCREEN_WIDTH - 32, height: 250 }
                  : { width: (SCREEN_WIDTH - 36) / 2, height: 160 },
              ]}
            />
          ))}
        </View>
      )}

      {/* Stats */}
      <View style={[s.statsRow, { borderColor: colors.border }]}>
        <View style={s.statsLeft}>
          {post.reactionsCount > 0 && (
            <View style={s.reactionStat}>
              <Text style={s.reactionEmoji}>👍</Text>
              <Text style={[s.statsText, { color: colors.muted }]}>{post.reactionsCount}</Text>
            </View>
          )}
        </View>
        <View style={s.statsRight}>
          {post.commentsCount > 0 && (
            <Text style={[s.statsText, { color: colors.muted }]}>{post.commentsCount} bình luận</Text>
          )}
        </View>
      </View>

      {/* Reaction Picker Popup */}
      {showReactionPicker && (
        <View style={[s.reactionPicker, { backgroundColor: colors.surface }]}>
          {Object.entries(EMOJI_MAP).map(([key, emoji]) => (
            <TouchableOpacity
              key={key}
              style={[s.emojiBtn, post.myReaction === key && s.emojiBtnActive]}
              onPress={() => {
                onReact?.(post.myReaction === key ? null : key);
                setShowReactionPicker(false);
              }}
            >
              <Text style={s.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Action Bar */}
      <View style={[s.actionBar, { borderColor: colors.border }]}>
        <TouchableOpacity
          style={s.actionBtn}
          onPress={() => onReact?.(post.myReaction ? null : 'like')}
          onLongPress={() => setShowReactionPicker((v) => !v)}
        >
          {post.myReaction ? (
            <Text style={{ fontSize: 18 }}>{EMOJI_MAP[post.myReaction] || '👍'}</Text>
          ) : (
            <Ionicons name="thumbs-up-outline" size={20} color={colors.muted} />
          )}
          <Text style={[s.actionText, { color: post.myReaction ? '#0068FF' : colors.muted }]}>
            {post.myReaction ? (post.myReaction === 'like' ? 'Thích' : EMOJI_MAP[post.myReaction]) : 'Thích'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={onComment}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.muted} />
          <Text style={[s.actionText, { color: colors.muted }]}>Bình luận</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.actionBtn} onPress={onShare}>
          <Ionicons name="share-outline" size={20} color={colors.muted} />
          <Text style={[s.actionText, { color: colors.muted }]}>Chia sẻ</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { marginBottom: 8, paddingBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 8 },
  avatarWrap: {},
  avatar: { width: 44, height: 44, borderRadius: 22 },
  headerInfo: { flex: 1, marginLeft: 10 },
  authorName: { fontSize: 15, fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  timeText: { fontSize: 12 },
  editedText: { fontSize: 12 },
  moreBtn: { padding: 8 },
  content: { paddingHorizontal: 12, paddingBottom: 10, fontSize: 15, lineHeight: 22 },
  mediaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, paddingHorizontal: 0 },
  mediaImg: { borderRadius: 0 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: StyleSheet.hairlineWidth },
  statsLeft: { flexDirection: 'row', alignItems: 'center' },
  statsRight: { flexDirection: 'row', alignItems: 'center' },
  reactionStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reactionEmoji: { fontSize: 16 },
  statsText: { fontSize: 13 },
  reactionPicker: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 52,
    left: 12,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    zIndex: 10,
    gap: 2,
  },
  emojiBtn: { padding: 6, borderRadius: 20 },
  emojiBtnActive: { backgroundColor: 'rgba(0,104,255,0.1)' },
  emojiText: { fontSize: 24 },
  actionBar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 6 },
  actionText: { fontSize: 13, fontWeight: '600' },
});

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CommentItemProps {
  comment: any;
  currentUserId: string;
  colors: any;
  onReply?: () => void;
  onDelete?: () => void;
  onAuthorPress?: (authorId: string) => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins}p`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function CommentItem({
  comment,
  currentUserId,
  colors,
  onReply,
  onDelete,
  onAuthorPress,
}: CommentItemProps) {
  const author = comment.authorId || {};
  const authorName = author.username || 'Người dùng';
  const authorAvatar = author.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=6366F1&color=fff&size=80&bold=true`;
  const isOwner = (author._id || author.id) === currentUserId;

  return (
    <View style={[s.row, comment.parentId && s.reply]}>
      <TouchableOpacity onPress={() => onAuthorPress?.(author._id || author.id)}>
        <Image source={{ uri: authorAvatar }} style={[s.avatar, comment.parentId && s.replyAvatar]} />
      </TouchableOpacity>

      <View style={s.bubble}>
        <View style={[s.contentBubble, { backgroundColor: colors.secondaryBackground || '#F3F4F6' }]}>
          <TouchableOpacity onPress={() => onAuthorPress?.(author._id || author.id)}>
            <Text style={[s.authorName, { color: colors.text }]}>{authorName}</Text>
          </TouchableOpacity>
          <Text style={[s.commentText, { color: colors.text }]}>{comment.content}</Text>
        </View>

        <View style={s.metaRow}>
          <Text style={[s.timeText, { color: colors.muted }]}>{timeAgo(comment.createdAt)}</Text>
          {comment.reactionsCount > 0 && (
            <Text style={[s.reactCount, { color: colors.muted }]}>👍 {comment.reactionsCount}</Text>
          )}
          <TouchableOpacity onPress={onReply}>
            <Text style={[s.replyBtn, { color: colors.muted }]}>Trả lời</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity onPress={onDelete}>
              <Ionicons name="trash-outline" size={14} color={colors.error || '#EF4444'} />
            </TouchableOpacity>
          )}
        </View>

        {comment.repliesCount > 0 && !comment.parentId && (
          <TouchableOpacity style={s.viewReplies}>
            <Ionicons name="return-down-forward-outline" size={14} color={colors.tint} />
            <Text style={[s.viewRepliesText, { color: colors.tint }]}>
              Xem {comment.repliesCount} phản hồi
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 6, gap: 8 },
  reply: { paddingLeft: 52 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  replyAvatar: { width: 28, height: 28, borderRadius: 14 },
  bubble: { flex: 1 },
  contentBubble: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  authorName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  commentText: { fontSize: 14, lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4, paddingLeft: 4 },
  timeText: { fontSize: 12 },
  reactCount: { fontSize: 12 },
  replyBtn: { fontSize: 12, fontWeight: '700' },
  viewReplies: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingLeft: 4 },
  viewRepliesText: { fontSize: 13, fontWeight: '600' },
});

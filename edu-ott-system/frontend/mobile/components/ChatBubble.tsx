import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import AnnouncementCard from '@/components/AnnouncementCard';
import type { CommunityMessage } from '@/types/community';

type Props = {
  message: CommunityMessage;
  isMine: boolean;
  isUnread?: boolean;
  showAvatar: boolean;
  senderName?: string;
  senderAvatar?: string | null;
  onOpenImage?: (url: string) => void;
};

const toTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const resolveMedia = (item: any) => (typeof item === 'string' ? null : item);

export default function ChatBubble({
  message,
  isMine,
  isUnread,
  showAvatar,
  senderName,
  senderAvatar,
  onOpenImage,
}: Props) {
  if (message.type === 'announcement') {
    return (
      <AnnouncementCard
        content={message.content}
        senderName={senderName}
        isPinned={!!message.isPinnedAnnouncement}
        time={toTime(message.createdAt)}
      />
    );
  }

  const medias = (message.mediaIds || []).map(resolveMedia).filter(Boolean);

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheir]}>
      {showAvatar && !isMine ? (
        <Image
          source={{
            uri:
              senderAvatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=0EA5E9&color=fff`,
          }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarSpacer} />
      )}

      <View style={[styles.bubble, isMine ? styles.mine : styles.their, !isMine && isUnread ? styles.unread : null]}>
        {!isMine && !!senderName ? <Text style={styles.sender}>{senderName}</Text> : null}

        {!!message.content && <Text style={[styles.content, isMine && { color: '#fff' }]}>{message.content}</Text>}

        {medias.map((media: any) => {
          const isImage = media.mimeType?.startsWith('image/');
          if (isImage) {
            return (
              <Pressable key={media._id || media.id || media.url} onPress={() => onOpenImage?.(media.url || '')}>
                <Image source={{ uri: media.url }} style={styles.inlineImage} />
              </Pressable>
            );
          }
          return (
            <View key={media._id || media.id || media.fileName} style={styles.fileBox}>
              <Text style={styles.fileText} numberOfLines={1}>
                📎 {media.fileName || 'File đính kèm'}
              </Text>
            </View>
          );
        })}

        <Text style={[styles.time, isMine && { color: '#DBEAFE' }]}>{toTime(message.createdAt)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', marginVertical: 4, alignItems: 'flex-end' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheir: { justifyContent: 'flex-start' },
  avatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6 },
  avatarSpacer: { width: 34 },
  bubble: { maxWidth: '82%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  mine: { backgroundColor: '#1D67FF', borderBottomRightRadius: 6 },
  their: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 6 },
  unread: { borderWidth: 1, borderColor: '#93C5FD', backgroundColor: '#EFF6FF' },
  sender: { color: '#2563EB', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  content: { color: '#111827', fontSize: 15, lineHeight: 20 },
  inlineImage: { width: 180, height: 160, borderRadius: 12, marginTop: 8 },
  fileBox: { marginTop: 8, padding: 8, borderRadius: 10, backgroundColor: '#E5E7EB' },
  fileText: { fontSize: 13, color: '#1F2937' },
  time: { marginTop: 6, fontSize: 11, color: '#6B7280', alignSelf: 'flex-end' },
});

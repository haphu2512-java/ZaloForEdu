import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, Modal, StyleSheet, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import ChatBubble from '@/components/ChatBubble';
import MessageInput from '@/components/MessageInput';
import { uploadMediaForm } from '@/utils/mediaService';
import type { CommunityChannel, CommunityMember, CommunityMessage } from '@/types/community';
import { joinCommunityChannelRoom, useCommunityStore } from '@/stores/communityStore';

type Props = {
  communityId: string;
  channel: CommunityChannel;
  currentMember?: CommunityMember;
};

const getUserId = (u: any) => (typeof u === 'string' ? u : u?._id || u?.id || '');

export default function ChatScreen({ communityId, channel, currentMember }: Props) {
  const listRef = useRef<FlatList<CommunityMessage>>(null);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);

  const {
    messagesByChannel,
    nextCursorByChannel,
    loadMessages,
    sendMessage,
  } = useCommunityStore();

  const key = `${communityId}:${channel._id}` as const;
  const messages = messagesByChannel[key] || [];
  const nextCursor = nextCursorByChannel[key];

  const canSendMessage = useMemo(() => {
    if (!currentMember) return false;
    if (currentMember.status !== 'active') return false;
    if (currentMember.mutedUntil && new Date(currentMember.mutedUntil) > new Date()) return false;
    return true;
  }, [currentMember]);

  const canPostAnnouncement = useMemo(
    () => ['owner', 'admin', 'mod'].includes(currentMember?.role || ''),
    [currentMember?.role],
  );

  useEffect(() => {
    loadMessages(communityId, channel._id, true);
    joinCommunityChannelRoom(communityId, channel._id);
  }, [communityId, channel._id, loadMessages]);

  useEffect(() => {
    if (!messages.length) return;
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [messages.length]);

  const handleSend = async ({ content, type }: { content: string; type: 'text' | 'announcement' }) => {
    if (type === 'announcement' && !canPostAnnouncement) {
      Alert.alert('Thông báo', 'Chỉ admin/mod mới được đăng thông báo');
      return;
    }
    await sendMessage({
      conversationId: communityId,
      channelId: channel._id,
      content,
      type,
      isPinnedAnnouncement: type === 'announcement',
    });
  };

  const uploadAndSendMedia = async (uri: string, fileName: string, mimeType: string, type: 'image' | 'file') => {
    const uploaded = await uploadMediaForm({ uri, fileName, mimeType });
    await sendMessage({
      conversationId: communityId,
      channelId: channel._id,
      mediaIds: [uploaded._id],
      content: '',
      type,
    });
  };

  const onAttachImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    await uploadAndSendMedia(asset.uri, asset.fileName || `image-${Date.now()}.jpg`, asset.mimeType || 'image/jpeg', 'image');
  };

  const onAttachFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ multiple: false, copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.length) return;
    const file = res.assets[0];
    await uploadAndSendMedia(file.uri, file.name, file.mimeType || 'application/octet-stream', 'file');
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item._id}
        inverted
        onEndReachedThreshold={0.3}
        onEndReached={() => {
          if (!nextCursor) return;
          loadMessages(communityId, channel._id, false);
        }}
        ListFooterComponent={nextCursor ? <ActivityIndicator style={{ marginVertical: 10 }} color="#1D67FF" /> : null}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item, index }) => {
          const sender = typeof item.senderId === 'string' ? { _id: item.senderId } : item.senderId;
          const isMine = getUserId(currentMember?.userId) === getUserId(sender);
          const seenBy = (item.seenBy || []).map((s: any) => (typeof s === 'string' ? s : s?._id || s?.id || ''));
          const isUnread = !isMine && !seenBy.includes(getUserId(currentMember?.userId));
          const next = messages[index + 1];
          const nextSender = next ? (typeof next.senderId === 'string' ? next.senderId : next.senderId?._id || next.senderId?.id) : '';
          const currentSender = getUserId(sender);
          const showAvatar = !isMine && currentSender !== nextSender;

          return (
            <ChatBubble
              message={item}
              isMine={isMine}
              isUnread={isUnread}
              showAvatar={showAvatar}
              senderName={(sender as any)?.username}
              senderAvatar={(sender as any)?.avatarUrl}
              onOpenImage={setImageViewerUrl}
            />
          );
        }}
      />

      <MessageInput
        disabled={!canSendMessage}
        canPostAnnouncement={canPostAnnouncement}
        onSend={handleSend}
        onAttachImage={onAttachImage}
        onAttachFile={onAttachFile}
      />

      <Modal visible={!!imageViewerUrl} transparent onRequestClose={() => setImageViewerUrl(null)}>
        <View style={styles.imageViewer}>
          {imageViewerUrl ? (
            <Image source={{ uri: imageViewerUrl }} style={styles.fullImage} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  imageViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullImage: { width: '100%', height: '80%' },
});

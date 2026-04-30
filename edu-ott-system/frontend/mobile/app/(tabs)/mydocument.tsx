import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { API_BASE_URL } from '@/utils/api';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createConversation, getConversations, getMessages, sendMessage } from '@/utils/messageService';
import { connectSocket } from '@/utils/socketService';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { uploadMediaForm, getMediaById } from '@/utils/mediaService';
import type { Conversation, Message, MediaItem } from '@/types/chat';

import { AudioBubbleMobile } from '@/components/chat/AudioBubbleMobile';
import { VoiceRecorderMobile } from '@/components/chat/VoiceRecorderMobile';

/** Format bytes → human-readable string */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format date for message timestamp */
function formatMsgTime(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  return `${d.getDate()}/${d.getMonth() + 1} ${hh}:${mm}`;
}

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');

function toAbsoluteMediaUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getMimeTypeFromFileName(fileName?: string): string {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  return 'application/octet-stream';
}

function isImageAttachment(media?: MediaItem | null): boolean {
  if (!media) return false;
  if (media.mimeType?.startsWith('image/')) return true;
  return getMimeTypeFromFileName(media.fileName).startsWith('image/');
}

function isAudioAttachment(media?: MediaItem | null): boolean {
  if (!media) return false;
  if (media.mimeType?.startsWith('audio/')) return true;
  const fileName = (media.fileName || '').toLowerCase();
  return /\.(mp3|m4a|aac|wav|ogg|opus|webm)$/i.test(fileName);
}

type ActionMenuOption = {
  text: string;
  onPress: () => void;
  isDestructive?: boolean;
  style?: 'default' | 'cancel' | 'destructive';
};

export default function MyDocumentScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();

  const [selfConv, setSelfConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [textInput, setTextInput] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const offRef = useRef<(() => void) | null>(null);

  const [mediaById, setMediaById] = useState<Record<string, MediaItem>>({});
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [actionMenu, setActionMenu] = useState<{ visible: boolean; options: ActionMenuOption[] }>({ visible: false, options: [] });
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const [conversationsList, setConversationsList] = useState<Conversation[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  // ── Lấy hoặc tạo self-conversation ──────────────────────────
  const getOrCreateSelfConv = useCallback(async (): Promise<Conversation | null> => {
    if (!user) {
      console.log('[MyDoc] User not logged in, skipping');
      return null;
    }
    
    try {
      const res = await getConversations(null, 100);
      const existing = (res?.items || []).find(
        (c) => c.type === 'direct' && c.participants.length === 1,
      );
      if (existing) return existing;

      // Tạo mới self-conversation (participantIds = [user.id])
      const created = await createConversation({ type: 'direct', participantIds: [user.id] });
      return created;
    } catch (e: any) {
      console.log('[MyDoc] getOrCreateSelfConv error:', e.message);
      return null;
    }
  }, [user]);

  const harvestMediaFromMessages = useCallback((msgs: Message[]) => {
    const mediaMap: Record<string, MediaItem> = {};
    msgs.forEach((m) => {
      (m.mediaIds || []).forEach((media: any) => {
        if (media && typeof media === 'object' && (media._id || media.id)) {
          const id = media._id || media.id;
          mediaMap[id] = media;
        }
      });
    });
    if (Object.keys(mediaMap).length > 0) setMediaById((prev) => ({ ...prev, ...mediaMap }));
  }, []);

  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await getMessages({ conversationId: convId, limit: 50 });
      const sorted = (res?.items || []).slice().sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
      setMessages(sorted);
      harvestMediaFromMessages(sorted);
    } catch (e: any) {
      console.log('[MyDoc] loadMessages error:', e.message);
    }
  }, [harvestMediaFromMessages]);

  const init = useCallback(async () => {
    setLoading(true);
    const conv = await getOrCreateSelfConv();
    setSelfConv(conv);
    if (conv?._id) await loadMessages(conv._id);
    setLoading(false);
  }, [getOrCreateSelfConv, loadMessages]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (active) void init();
      return () => { active = false; };
    }, [init]),
  );

  // ── Socket real-time ─────────────────────────────────────────
  useEffect(() => {
    if (!selfConv?._id) return;
    let mounted = true;

    const setup = async () => {
      const socket = await connectSocket();
      if (!mounted || !socket) return;

      const onNewMsg = (payload: any) => {
        const msg = payload?.message || payload;
        const convId = msg?.conversationId;
        if (convId !== selfConv._id) return;
        setMessages((prev) => {
          const alreadyIn = prev.some((m) => m._id === msg._id);
          if (alreadyIn) return prev;
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      };

      socket.on('new_message', onNewMsg);
      offRef.current = () => socket.off('new_message', onNewMsg);
    };

    void setup();
    return () => {
      mounted = false;
      offRef.current?.();
    };
  }, [selfConv?._id]);

  // ── Socket & Tải media còn thiếu ────────────────────────────
  useEffect(() => {
    const stringIds = messages.flatMap((m) =>
      (m.mediaIds || [])
        .map((mid: any) => typeof mid === 'string' ? mid : (mid._id || mid.id || ''))
        .filter((id: string) => !!id && !id.startsWith('temp-'))
    );
    const uniqueIds = Array.from(new Set(stringIds));
    const missingIds = uniqueIds.filter((id) => !mediaById[id]);

    if (missingIds.length > 0) {
      void (async () => {
        const entries = await Promise.all(
          missingIds.map(async (id) => {
            try { return [id, await getMediaById(id)] as const; } catch { return null; }
          })
        );
        const validMsgs = entries.filter((e): e is readonly [string, MediaItem] => !!e);
        if (validMsgs.length > 0) setMediaById((prev) => ({ ...prev, ...Object.fromEntries(validMsgs) }));
      })();
    }
  }, [messages.length]);

  // ── Gửi tin nhắn giọng nói ────────────────────────────────────────
  const handleSendVoice = async (uri: string, duration: number) => {
    if (!uri || !selfConv?._id || sending) return;
    setShowVoiceRecorder(false);
    setSending(true);

    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      const fileName = `voice-${Date.now()}.${ext}`;
      
      const mimeType = ext === 'm4a' ? 'audio/mp4' : 
                       ext === 'mp3' ? 'audio/mpeg' : 
                       ext === 'wav' ? 'audio/wav' : 
                       ext === 'aac' ? 'audio/aac' : 
                       ext === 'webm' ? 'audio/webm' : 'audio/mp4';

      const uploaded = await uploadMediaForm({ uri, fileName, mimeType, duration });
      const mediaId = uploaded?._id || uploaded?.id;

      if (!mediaId) throw new Error('Upload ghi âm không thành công');

      setMediaById((prev) => ({ ...prev, [mediaId]: uploaded as MediaItem }));
      const msg = await sendMessage({
        conversationId: selfConv._id,
        content: '',
        mediaIds: [mediaId],
      });
      setMessages((prev) => {
        const alreadyIn = prev.some((m) => m._id === msg._id);
        return alreadyIn ? prev : [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi ghi âm');
    } finally {
      setSending(false);
    }
  };

  // ── Gửi tin nhắn text ────────────────────────────────────────
  const handleSend = async () => {
    const text = textInput.trim();
    if (!text || !selfConv?._id || sending) return;
    setTextInput('');
    setSending(true);
    try {
      const msg = await sendMessage({ conversationId: selfConv._id, content: text });
      setMessages((prev) => {
        const alreadyIn = prev.some((m) => m._id === msg._id);
        return alreadyIn ? prev : [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  // ── Gửi tài liệu ─────────────────────────────────────────────
  const handlePickDocument = async () => {
    if (!selfConv?._id) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setUploading(true);
      const fileName = asset.name || `file-${Date.now()}`;

      const uploaded = await uploadMediaForm({
        uri: asset.uri,
        fileName: fileName,
        mimeType: asset.mimeType || 'application/octet-stream',
      });

      const mediaId = uploaded?._id || uploaded?.id;
      if (!mediaId) throw new Error('Upload không thành công');

      const msg = await sendMessage({
        conversationId: selfConv._id,
        content: asset.name,
        mediaIds: [mediaId],
      });
      setMessages((prev) => {
        const alreadyIn = prev.some((m) => m._id === msg._id);
        return alreadyIn ? prev : [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể gửi tài liệu');
    } finally {
      setUploading(false);
    }
  };

  // ── Chụp ảnh ─────────────────────────────────────────────
  const handleTakeImage = async () => {
    if (!selfConv?._id) return;
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập camera để chụp ảnh');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images' as any,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      setUploading(true);
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
      const fileName = asset.fileName || `photo-${Date.now()}.${ext}`;

      const uploaded = await uploadMediaForm({
        uri: asset.uri,
        fileName: fileName,
        mimeType: mimeType,
      });

      const mediaId = uploaded?._id || uploaded?.id;
      if (!mediaId) throw new Error('Upload ảnh không thành công');

      const msg = await sendMessage({
        conversationId: selfConv._id,
        content: fileName,
        mediaIds: [mediaId],
      });
      setMediaById((prev) => ({ ...prev, [mediaId]: uploaded as MediaItem }));
      setMessages((prev) => {
        const alreadyIn = prev.some((m) => m._id === msg._id);
        return alreadyIn ? prev : [...prev, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể chụp và gửi ảnh');
    } finally {
      setUploading(false);
    }
  };

  const openAttachment = useCallback(async (media?: MediaItem | null) => {
    if (!media?.url) return;
    try { await Linking.openURL(media.url); } catch { Alert.alert('Lỗi', 'Không thể mở tệp này'); }
  }, []);

  const handleMessageLongPress = (msg: Message) => {
    setActionMenu({
      visible: true,
      options: [
        {
          text: 'Chuyển tiếp', onPress: async () => {
            try {
              const res = await getConversations(null, 50);
              const targets = (res.items || []).filter((c) => c._id !== selfConv?._id);
              setConversationsList(targets);
              setForwardSource(msg);
              setForwardModalVisible(true);
            } catch { Alert.alert('Lỗi', 'Không thể tải danh sách cuộc trò chuyện'); }
          }
        },
        { text: 'Hủy', style: 'cancel', onPress: () => { } }
      ]
    });
  };

  const handleForward = async (targetConversationId: string) => {
    if (!forwardSource) return;
    setIsForwarding(true);
    try {
      const mediaIdsArray = (forwardSource.mediaIds || []).map((m: any) =>
        typeof m === 'string' ? m : (m._id || m.id)
      ).filter(Boolean);

      await sendMessage({
        conversationId: targetConversationId,
        content: forwardSource.content || 'Ghi chú',
        mediaIds: mediaIdsArray,
        forwardFrom: forwardSource._id || forwardSource.id,
      });
      setForwardModalVisible(false);
      Alert.alert('Thành công', 'Đã chuyển tiếp');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể chuyển tiếp');
    } finally { setIsForwarding(false); }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const time = formatMsgTime(item.createdAt);

    return (
      <TouchableOpacity onLongPress={() => handleMessageLongPress(item)} activeOpacity={0.8} style={styles.msgRow}>
        <View
          style={[
            styles.bubble,
            {
              backgroundColor: colorScheme === 'dark' ? colors.surface : colors.tint + '18',
            },
          ]}
        >
          {item.forwardFrom && (
            <Text style={{ color: colors.muted, fontSize: 11, marginBottom: 4, fontStyle: 'italic' }}>↪ Chuyển tiếp</Text>
          )}

          {item.content ? (
            <Text style={[styles.msgText, { color: colors.text }]}>{item.content}</Text>
          ) : null}

          {/* Render Media */}
          {!!item.mediaIds?.length && (
            <View style={{ marginTop: item.content ? 8 : 0, gap: 6 }}>
              {item.mediaIds.map((mediaItem: any, idx) => {
                const mediaId = typeof mediaItem === 'string' ? mediaItem : (mediaItem._id || mediaItem.id || '');
                const rawMedia = typeof mediaItem === 'string' ? mediaById[mediaId] : mediaItem;
                const media = rawMedia ? { ...rawMedia, url: toAbsoluteMediaUrl(rawMedia.url) } : null;
                const isImage = isImageAttachment(media);
                const isAudio = isAudioAttachment(media);
                const fileName = media?.fileName || `Tệp đính kèm ${idx + 1}`;
                const canOpen = !!media?.url;

                if (isAudio && media?.url) {
                  return <AudioBubbleMobile key={`${mediaId}-${idx}`} url={media.url} isMe={true} duration={media.duration} />;
                }

                if (isImage && media?.url) {
                  return (
                    <TouchableOpacity key={`${mediaId}-${idx}`} onPress={() => setViewImageUrl(media.url)} activeOpacity={0.9}>
                      <Image source={{ uri: media.url }} style={{ width: 200, height: 160, borderRadius: 12 }} resizeMode="cover" />
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity
                    key={`${mediaId}-${idx}`}
                    disabled={!canOpen}
                    onPress={() => openAttachment(media)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, padding: 8, borderRadius: 10, width: 230 }}
                  >
                    <View style={[styles.fileIconWrap, { backgroundColor: colors.tint + '20', width: 36, height: 36, marginRight: 8 }]}>
                      <Ionicons name="document-text" size={20} color={colors.tint} />
                    </View>
                    <View style={{ width: 140, justifyContent: 'center' }}>
                      <Text numberOfLines={1} ellipsizeMode="middle" style={{ color: colors.text, fontSize: 13, fontWeight: '600' }}>{fileName}</Text>
                      {media?.size ? (
                        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                          {media.size < 1024 * 1024 ? `${(media.size / 1024).toFixed(1)} KB` : `${(media.size / (1024 * 1024)).toFixed(1)} MB`} • {(media.fileName || '').split('.').pop()?.toUpperCase()}
                        </Text>
                      ) : (
                        <Text style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
                           {(media?.fileName || '').split('.').pop()?.toUpperCase() || 'FILE'}
                        </Text>
                      )}
                    </View>
                    {canOpen && <Ionicons name="download-outline" size={20} color={colors.muted} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Text style={[styles.msgTime, { color: colors.muted }]}>{time}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Loading ───────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Đang tải My Document...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* ── Header info banner ──────────────────── */}
      <View style={[styles.infoBanner, { backgroundColor: colors.tint + '15', borderBottomColor: colors.border }]}>
        <Ionicons name="cloud-outline" size={18} color={colors.tint} />
        <Text style={[styles.infoBannerText, { color: colors.tint }]}>
          Lưu ghi chú & tài liệu cá nhân. Chỉ mình bạn xem được.
        </Text>
      </View>

      {/* ── Message list ─────────────────────────── */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item._id}
        renderItem={renderMessage}
        contentContainerStyle={[
          styles.listContent,
          messages.length === 0 && { flex: 1 },
        ]}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.center}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.tint + '18' }]}>
              <Ionicons name="cloud-upload-outline" size={52} color={colors.tint} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>My Document trống</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Gửi ghi chú hoặc tài liệu{'\n'}để lưu trữ cho riêng bạn
            </Text>
          </View>
        }
      />

      {/* ── Input bar ────────────────────────────── */}
      {showVoiceRecorder ? (
        <View style={[{ paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          <VoiceRecorderMobile
            onCancel={() => setShowVoiceRecorder(false)}
            onSend={handleSendVoice}
          />
        </View>
      ) : (
        <View style={[styles.inputBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.attachBtn]}
            onPress={handleTakeImage}
            disabled={uploading || sending}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.tint} />
            ) : (
              <Ionicons name="camera-outline" size={26} color={colors.muted} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.attachBtn]}
            onPress={handlePickDocument}
            disabled={uploading || sending}
          >
            <Ionicons name="add-circle-outline" size={26} color={colors.muted} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colorScheme === 'dark' ? colors.background : '#F1F5F9',
                color: colors.text,
              },
            ]}
            placeholder="Nhập ghi chú..."
            placeholderTextColor={colors.muted}
            value={textInput}
            onChangeText={setTextInput}
            multiline
            maxLength={4000}
            onSubmitEditing={handleSend}
            editable={!sending && !uploading}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              { backgroundColor: textInput.trim() ? colors.tint : colors.muted + '20' },
            ]}
            onPress={textInput.trim() ? handleSend : () => setShowVoiceRecorder(true)}
            disabled={sending || uploading}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={textInput.trim() ? "send" : "mic"} size={18} color={textInput.trim() ? '#fff' : colors.muted} />
            )}
          </TouchableOpacity>
        </View>
      )}
      {/* Modal xem ảnh */}
      <Modal visible={!!viewImageUrl} transparent animationType="fade" onRequestClose={() => setViewImageUrl(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 }} onPress={() => setViewImageUrl(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {viewImageUrl && <Image source={{ uri: viewImageUrl }} style={{ width: '100%', height: '80%' }} resizeMode="contain" />}
        </View>
      </Modal>

      {/* Modal action menu (long press) */}
      <Modal visible={actionMenu.visible} transparent animationType="fade" onRequestClose={() => setActionMenu({ visible: false, options: [] })}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 16 }} activeOpacity={1} onPress={() => setActionMenu({ visible: false, options: [] })}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 20 : 0 }}>
            {actionMenu.options.map((opt, index) => (
              <TouchableOpacity
                key={index}
                style={[{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                onPress={() => { setActionMenu({ visible: false, options: [] }); opt.onPress?.(); }}
              >
                <Text style={{ fontSize: 16, color: opt.isDestructive ? '#EF4444' : colors.text, fontWeight: opt.style === 'cancel' ? '700' : '400' }}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal chuyển tiếp */}
      <Modal visible={forwardModalVisible} animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 40 : 0 }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface }}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Chuyển tiếp</Text>
            <View style={{ width: 36 }} />
          </View>
          <FlatList
            data={conversationsList}
            keyExtractor={(item) => item._id || item.id || ''}
            renderItem={({ item }) => (
              <TouchableOpacity
                disabled={isForwarding}
                onPress={() => handleForward(item._id || item.id || '')}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{item.name || item.participants?.find((p) => p._id !== user?.id)?.username || 'Trò chuyện'}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  infoBannerText: { fontSize: 12, fontWeight: '600', flex: 1 },

  listContent: { paddingHorizontal: 12, paddingVertical: 8 },

  msgRow: { marginBottom: 10, alignItems: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: 'flex-end',
  },
  msgText: { fontSize: 15, lineHeight: 21 },
  msgTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 200 },
  fileIconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 14, fontWeight: '600' },

  emptyIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  attachBtn: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});

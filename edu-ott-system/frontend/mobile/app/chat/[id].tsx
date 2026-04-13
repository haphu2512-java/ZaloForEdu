import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Linking,
  StyleSheet,
  Image,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/auth';
import {
  getMessages,
  sendMessage,
  markMessageRead,
  deleteMessage,
  recallMessage,
  reactToMessage,
  getConversations,
} from '../../utils/messageService';
import { getPinnedMessages, pinMessage } from '../../utils/groupFeatureService';
import { uploadMediaBase64, getMediaById, uploadImageToCloudinary } from '../../utils/mediaService';
import {
  connectSocket,
  joinConversation,
  emitTyping,
  emitStopTyping,
  emitMessageDelivered,
  emitMessageSeen,
} from '../../utils/socketService';
import type { Message, Conversation, MediaItem } from '../../types/chat';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

import PinnedBar from '@/components/chat/PinnedBar';
import PollBubble from '@/components/chat/PollBubble';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '👍', '❤️', '🔥', '😭', '🙏', '🎉'];

function getMessageSenderId(msg: Message): string {
  if (typeof msg.senderId === 'string') return msg.senderId;
  return msg.senderId?._id || (msg.senderId as any)?.id || '';
}

function getMessageId(msg: Message): string {
  return msg._id || msg.id || '';
}

function getConversationIdFromMessage(msg: Message): string {
  if (typeof msg.conversationId === 'string') return msg.conversationId;
  return (msg.conversationId as any)?._id || '';
}

function getConversationTitle(conv: Conversation, currentUserId: string) {
  if (conv.type === 'group') return conv.name || 'Nhóm chat';
  const otherUser = conv.participants?.find((p) => (p._id || p.id) !== currentUserId);
  return otherUser?.username || 'Cuộc trò chuyện';
}

function isImageMimeType(mimeType?: string): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

export default function ChatScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [messages, setMessages] = useState<Message[]>([]);
  const currentUserId = user?.id || (user as any)?._id || '';
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [isSocketReady, setIsSocketReady] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  // Reply
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Forwarding
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [pinnedItems, setPinnedItems] = useState<any[]>([]); // Bảng tin
  const [mediaById, setMediaById] = useState<Record<string, MediaItem>>({});

  // Action Menu
  const [actionMenu, setActionMenu] = useState<{ visible: boolean; options: {text: string, onPress: () => void, isDestructive?: boolean}[] }>({ visible: false, options: [] });

  // Image viewer
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);

  const getUserId = (value: any): string => {
    if (!value) return '';
    if (typeof value === 'string') return value;
    return value._id || value.id || '';
  };

  const otherParticipant =
    conversation?.type === 'direct'
      ? conversation.participants?.find((p) => (p._id || p.id || '') !== currentUserId)
      : null;

  const conversationTitle =
    conversation?.preference?.nickname ||
    (conversation ? getConversationTitle(conversation, currentUserId) : 'Trò chuyện');

  const headerAvatarUrl = conversation?.type === 'group'
    ? conversation.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationTitle)}&background=8B5CF6&color=fff&size=150&bold=true`
    : otherParticipant?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(conversationTitle)}&background=2563EB&color=fff&size=150&bold=true`;

  const ensureMediaLoaded = useCallback(async (mediaIds: string[]) => {
    const uniqueIds = Array.from(new Set((mediaIds || []).filter(Boolean)));
    const missingIds = uniqueIds.filter((id) => !mediaById[id]);
    if (missingIds.length === 0) return;
    const entries = await Promise.all(
      missingIds.map(async (id) => {
        try {
          const media = await getMediaById(id);
          return [id, media] as const;
        } catch {
          return null;
        }
      }),
    );
    const validEntries = entries.filter((e): e is readonly [string, MediaItem] => !!e);
    if (!validEntries.length) return;
    setMediaById((prev) => ({
      ...prev,
      ...Object.fromEntries(validEntries),
    }));
  }, [mediaById]);

  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMessages({ conversationId, limit: 30 });
      setMessages(res.items);
      setNextCursor(res.nextCursor);
      const convRes = await getConversations(null, 100);
      const matched = (convRes.items || []).find((item) => (item._id || item.id) === conversationId) || null;
      setConversation(matched);
      if (matched && matched.type === 'group') {
        getPinnedMessages(matched._id || matched.id).then(setPinnedItems).catch(console.error);
      }
    } catch (error) {
      console.log('Error loading messages', error);
      Alert.alert('Lỗi', 'Không thể tải tin nhắn');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadInitialMessages();
  }, [loadInitialMessages]);

  const markedMessageIds = useRef<Set<string>>(new Set());
  const isTypingRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getNormalizedUserIds = useCallback((ids: any[] = []): string[] => (
    ids
      .map((u: any) => (typeof u === 'string' ? u : u?._id || u?.id || ''))
      .filter(Boolean)
  ), []);

  const stopTypingWithEmit = useCallback(() => {
    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
      typingStopTimeoutRef.current = null;
    }
    if (!isTypingRef.current) return;
    emitStopTyping(conversationId);
    isTypingRef.current = false;
  }, [conversationId]);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);

    if (!isSocketReady) return;
    if (!text.trim()) {
      stopTypingWithEmit();
      return;
    }

    if (!isTypingRef.current) {
      emitTyping(conversationId);
      isTypingRef.current = true;
    }

    if (typingStopTimeoutRef.current) {
      clearTimeout(typingStopTimeoutRef.current);
    }
    typingStopTimeoutRef.current = setTimeout(() => {
      stopTypingWithEmit();
    }, 1500);
  }, [conversationId, isSocketReady, stopTypingWithEmit]);

  useEffect(() => {
    if (messages.length > 0 && currentUserId) {
      const getMessageIdStr = (m: any) => typeof m._id === 'string' ? m._id : m.id;
      const unreadMessages = messages.filter((m) => {
        const mid = getMessageIdStr(m);
        if (markedMessageIds.current.has(mid)) return false;
        
        const senderId = typeof m.senderId === 'string' ? m.senderId : m.senderId?._id || m.senderId?.id;
        // Don't mark our own messages as read
        if (senderId === currentUserId) return false;

        const seenList = getNormalizedUserIds(m.seenBy || []);
        return !seenList.includes(currentUserId);
      });

      if (unreadMessages.length > 0) {
        unreadMessages.forEach(m => markedMessageIds.current.add(getMessageIdStr(m)));
        Promise.all(
          unreadMessages.map(async (m) => {
            const messageId = getMessageIdStr(m);
            emitMessageDelivered(messageId);
            try {
              await markMessageRead(messageId);
            } catch {
              // Keep socket read receipt even if HTTP call fails.
            }
            emitMessageSeen(messageId);
          }),
        ).catch(() => null);
      }
    }
  }, [messages, currentUserId, getNormalizedUserIds]);

  useEffect(() => () => stopTypingWithEmit(), [stopTypingWithEmit]);

  useEffect(() => {
    const ids = messages.flatMap((m) => m.mediaIds || []);
    if (ids.length) {
      void ensureMediaLoaded(ids);
    }
  }, [messages, ensureMediaLoaded]);

  useEffect(() => {
    let mounted = true;
    let socketRef: any = null;

    const setupSocket = async () => {
      const socket = await connectSocket();
      if (!mounted || !socket) return;
      socketRef = socket;
      joinConversation(conversationId);
      setIsSocketReady(socket.connected);

      const onConnect = () => { setIsSocketReady(true); joinConversation(conversationId); };
      const onDisconnect = () => setIsSocketReady(false);

      const onNewMessage = (message: Message) => {
        const msgConvId = getConversationIdFromMessage(message);
        if (msgConvId !== conversationId) return;
        setMessages((prev) => {
          if (prev.some((m) => getMessageId(m) === getMessageId(message))) return prev;
          let enhancedMessage = { ...message };
          if (enhancedMessage.replyTo && typeof enhancedMessage.replyTo === 'string') {
            const originalMsg = prev.find((m) => getMessageId(m) === enhancedMessage.replyTo);
            if (originalMsg) enhancedMessage.replyTo = originalMsg;
          }
          return [enhancedMessage, ...prev];
        });
        if (getMessageSenderId(message) !== currentUserId) {
          const messageId = getMessageId(message);
          emitMessageDelivered(messageId);
          markMessageRead(messageId)
            .catch(() => null)
            .finally(() => emitMessageSeen(messageId));
          setTypingUserIds((prev) => prev.filter((id) => id !== getMessageSenderId(message)));
        }
      };

      const onMessageRecalled = (payload: { messageId: string; conversationId: string }) => {
        if (payload.conversationId !== conversationId) return;
        setMessages((prev) =>
          prev.map((m) => (getMessageId(m) === payload.messageId ? { ...m, isRecalled: true } : m)),
        );
      };

      const onMessageSeen = (payload: { messageId: string; userId: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            getMessageId(m) === payload.messageId
              ? { ...m, seenBy: Array.from(new Set([...(m.seenBy || []), payload.userId])), deliveredTo: Array.from(new Set([...(m.deliveredTo || []), payload.userId])) }
              : m,
          ),
        );
      };

      const onMessageDelivered = (payload: { messageId: string; userId: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            getMessageId(m) === payload.messageId
              ? { ...m, deliveredTo: Array.from(new Set([...(m.deliveredTo || []), payload.userId])) }
              : m,
          ),
        );
      };

      const onTyping = (payload: { conversationId: string; userId: string }) => {
        if (payload.conversationId !== conversationId || payload.userId === currentUserId) return;
        setTypingUserIds((prev) => (prev.includes(payload.userId) ? prev : [...prev, payload.userId]));
      };

      const onStopTyping = (payload: { conversationId: string; userId: string }) => {
        if (payload.conversationId !== conversationId || payload.userId === currentUserId) return;
        setTypingUserIds((prev) => prev.filter((id) => id !== payload.userId));
      };

      const onPinnedItemsUpdated = (items: any[]) => {
        setPinnedItems(items);
      };

      const onMessageReacted = (payload: { messageId: string; reactions: any[] }) => {
        setMessages((prev) =>
          prev.map((m) => (getMessageId(m) === payload.messageId ? { ...m, reactions: payload.reactions } : m)),
        );
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('new_message', onNewMessage);
      socket.on('message_recalled', onMessageRecalled);
      socket.on('message_seen', onMessageSeen);
      socket.on('message_delivered', onMessageDelivered);
      socket.on('typing', onTyping);
      socket.on('stop_typing', onStopTyping);
      socket.on('pinned_items_updated', onPinnedItemsUpdated);
      socket.on('message_reacted', onMessageReacted);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('new_message', onNewMessage);
        socket.off('message_recalled', onMessageRecalled);
        socket.off('message_seen', onMessageSeen);
        socket.off('message_delivered', onMessageDelivered);
        socket.off('typing', onTyping);
        socket.off('stop_typing', onStopTyping);
        socket.off('pinned_items_updated', onPinnedItemsUpdated);
        socket.off('message_reacted', onMessageReacted);
      };
    };

    const cleanupPromise = setupSocket();
    return () => {
      mounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => { if (typeof cleanup === 'function') cleanup(); });
    };
  }, [conversationId, currentUserId]);

  const loadMoreMessages = async () => {
    if (!nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await getMessages({ conversationId, limit: 20, cursor: nextCursor });
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => getMessageId(m)));
        const incoming = (res.items || []).filter((m) => !existing.has(getMessageId(m)));
        return [...prev, ...incoming];
      });
      setNextCursor(res.nextCursor);
    } catch (error) {
      console.log('Error loading more messages', error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text) return;
    stopTypingWithEmit();
    setIsSending(true);
    const replyId = replyTo ? getMessageId(replyTo) : undefined;
    setReplyTo(null);
    try {
      const newMsg = await sendMessage({ conversationId, content: text, replyTo: replyId });
      setMessages((prev) => {
        if (prev.some((m) => getMessageId(m) === getMessageId(newMsg))) return prev;
        let enhancedMessage = { ...newMsg };
        if (enhancedMessage.replyTo && typeof enhancedMessage.replyTo === 'string' && replyTo) {
          enhancedMessage.replyTo = replyTo;
        }
        return [enhancedMessage, ...prev];
      });
      setInputText('');
      setShowEmojiPanel(false);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const handlePickImage = async () => {
    setShowMediaMenu(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets?.length) return;
    setIsSending(true);
    try {
      const asset = result.assets[0];
      const uploadedUrl = await uploadImageToCloudinary(asset.uri);
      // Register as media item through base64 approach (fallback: send with URL as content)
      const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const media = await uploadMediaBase64({ fileName: `photo-${Date.now()}.${ext}`, mimeType, contentBase64: base64 });
      const newMsg = await sendMessage({ conversationId, mediaIds: [media._id], content: '' });
      setMessages((prev) =>
        prev.some((m) => getMessageId(m) === getMessageId(newMsg)) ? prev : [newMsg, ...prev],
      );
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể gửi ảnh');
    } finally {
      setIsSending(false);
    }
  };

  const handleDocumentPick = async () => {
    setShowMediaMenu(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];
      setIsSending(true);
      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });
        const media = await uploadMediaBase64({
          fileName: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          contentBase64: base64,
        });
        const newMsg = await sendMessage({ conversationId, mediaIds: [media._id], content: `Đã gửi file: ${asset.name}` });
        setMessages((prev) =>
          prev.some((m) => getMessageId(m) === getMessageId(newMsg)) ? prev : [newMsg, ...prev],
        );
      } catch (uploadErr) {
        Alert.alert('Lỗi', 'Không thể tải lên file');
      } finally {
        setIsSending(false);
      }
    } catch (e) {
      console.log('Document picker err', e);
    }
  };

  const openForwardModal = async (msg: Message) => {
    try {
      const res = await getConversations(null, 50);
      const targets = (res.items || []).filter((c) => (c._id || c.id) !== conversationId);
      setConversations(targets);
      setForwardSource(msg);
      setForwardModalVisible(true);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tải danh sách cuộc trò chuyện');
    }
  };

  const handleForward = async (targetConversationId: string) => {
    if (!forwardSource) return;
    setIsForwarding(true);
    try {
      const fallbackContent = forwardSource.content?.trim() || (forwardSource.mediaIds?.length ? 'Tin nhắn được chuyển tiếp' : '');
      await sendMessage({
        conversationId: targetConversationId,
        content: fallbackContent || 'Tin nhắn được chuyển tiếp',
        mediaIds: forwardSource.mediaIds || [],
        forwardFrom: getMessageId(forwardSource),
      });
      setForwardModalVisible(false);
      setForwardSource(null);
      Alert.alert('Thành công', 'Đã chuyển tiếp tin nhắn');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể chuyển tiếp');
    } finally {
      setIsForwarding(false);
    }
  };

  const handleReactToMessage = async (msg: Message) => {
    Alert.alert(
      'Chọn cảm xúc', '',
      [...QUICK_EMOJIS, 'Gỡ cảm xúc', 'Hủy'].map((emoji) => ({
        text: emoji,
        onPress: async () => {
          if (emoji === 'Hủy') return;
          try {
            const reactions = await reactToMessage(getMessageId(msg), emoji === 'Gỡ cảm xúc' ? undefined : emoji);
            setMessages((prev) =>
              prev.map((m) => getMessageId(m) === getMessageId(msg) ? { ...m, reactions: reactions || [] } : m),
            );
          } catch (_e) {
            Alert.alert('Lỗi', 'Không thể thả cảm xúc');
          }
        },
      })),
    );
  };

  const handleOpenConversationOptions = () => {
    if (!conversation) return;
    router.push({ pathname: '/conversation-details', params: { id: conversationId } });
  };

  const handleMessageLongPress = (msg: Message) => {
    const isMine = getMessageSenderId(msg) === currentUserId;
    const isGroup = conversation?.type === 'group';
    const buttons: any[] = [{ text: 'Hủy', style: 'cancel' }];

    if (!msg.isRecalled) {
      buttons.push({ text: '↩️ Trả lời', onPress: () => setReplyTo(msg) });
    }
    if (isMine && !msg.isRecalled) {
      buttons.push({
        text: '↩ Thu hồi',
        onPress: async () => {
          try {
            await recallMessage(getMessageId(msg));
            setMessages((prev) => prev.map((m) => getMessageId(m) === getMessageId(msg) ? { ...m, isRecalled: true } : m));
          } catch { Alert.alert('Lỗi', 'Không thể thu hồi'); }
        },
      });
    }
    if (!msg.isRecalled) {
      buttons.push({
        text: '🗑️ Xóa phía tôi',
        isDestructive: true,
        onPress: async () => {
          try {
            await deleteMessage(getMessageId(msg));
            setMessages((prev) => prev.filter((m) => getMessageId(m) !== getMessageId(msg)));
          } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
        },
      });
      buttons.push({ text: '😊 Thả cảm xúc', onPress: () => handleReactToMessage(msg) });
      buttons.push({ text: '↗️ Chuyển tiếp', onPress: () => openForwardModal(msg) });
    }
    if (isGroup && !msg.isRecalled) {
      buttons.push({
        text: '📌 Ghim tin nhắn',
        onPress: async () => {
          try {
            const updatedItems = await pinMessage(conversationId, getMessageId(msg));
            setPinnedItems(updatedItems);
            Alert.alert('Thành công', 'Đã ghim tin nhắn');
          } catch (err: any) { 
            Alert.alert('Lỗi', err.message || 'Không thể ghim'); 
          }
        },
      });
    }
    setActionMenu({ visible: true, options: buttons });
  };

  /** Render message status icon for my messages */
  const renderMessageStatus = (item: Message) => {
    if (item.status === 'sending') return <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.6)" />;
    const seenBy = getNormalizedUserIds(item.seenBy || []).filter((id) => id !== currentUserId);
    if (seenBy.length > 0) return <Ionicons name="checkmark-done" size={11} color="#60EFFF" />;
    const deliveredTo = getNormalizedUserIds(item.deliveredTo || []).filter((id) => id !== currentUserId);
    if (deliveredTo.length > 0) return <Ionicons name="checkmark-done" size={11} color="rgba(255,255,255,0.7)" />;
    return <Ionicons name="checkmark" size={11} color="rgba(255,255,255,0.6)" />;
  };

  const typingParticipants = typingUserIds
    .map((uid) => conversation?.participants?.find((p) => (p._id || p.id || '') === uid)?.username || 'Ai đó')
    .filter(Boolean);
  const typingText =
    typingParticipants.length === 0
      ? ''
      : typingParticipants.length === 1
        ? `${typingParticipants[0]} đang nhập...`
        : `${typingParticipants[0]} và ${typingParticipants.length - 1} người khác đang nhập...`;

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = getMessageSenderId(item) === currentUserId;
    const senderName = typeof item.senderId === 'string' ? '' : item.senderId?.username || '';
    const senderAvatarUrl = typeof item.senderId === 'string' ? null : item.senderId?.avatarUrl;

    if (item.isRecalled) {
      return (
        <View style={[styles.bubbleWrapper, isMine ? styles.myWrapper : styles.theirWrapper]}>
          <View style={[styles.bubble, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F1F5F9' }]}>
            <Text style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 14 }}>Tin nhắn đã bị thu hồi</Text>
          </View>
        </View>
      );
    }

    // Is it a poll?
    if (item.type === 'poll' && item.pollId) {
      return (
        <View style={{ marginBottom: 8 }}>
          <PollBubble 
            poll={item.pollId as any} 
            currentUserId={currentUserId} 
            colors={colors} 
            brand="#0068FF" 
            isMyMessage={isMine} 
          />
        </View>
      );
    }

    // Get reply info
    const replyMsg = item.replyTo ? (typeof item.replyTo === 'object' ? item.replyTo : null) : null;

    return (
      <Pressable onLongPress={() => handleMessageLongPress(item)} style={[styles.bubbleWrapper, isMine ? styles.myWrapper : styles.theirWrapper]}>
        {/* Avatar for their messages */}
        {!isMine && (
          <Image
            source={{ uri: senderAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=0EA5E9&color=fff&size=60&bold=true` }}
            style={styles.senderAvatar}
          />
        )}
        <View style={{ flex: 1, alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
          {/* Sender name in groups */}
          {!isMine && conversation?.type === 'group' && senderName ? (
            <Text style={{ fontSize: 11, color: colors.tint, fontWeight: '600', marginBottom: 2, marginLeft: 4 }}>{senderName}</Text>
          ) : null}

          <View style={[styles.bubble, isMine ? { backgroundColor: '#0068FF' } : { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F1F5F9' }]}>
            {/* Reply quote */}
            {replyMsg && (
              <View style={[styles.replyQuote, { borderLeftColor: isMine ? 'rgba(255,255,255,0.5)' : colors.tint }]}>
                <Text style={{ color: isMine ? 'rgba(255,255,255,0.6)' : colors.tint, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                  {typeof (replyMsg as any).senderId === 'object' ? (replyMsg as any).senderId?.username : 'Tin nhắn'}
                </Text>
                <Text style={{ color: isMine ? 'rgba(255,255,255,0.7)' : colors.muted, fontSize: 12 }} numberOfLines={2}>
                  {(replyMsg as any).content || 'File đính kèm'}
                </Text>
              </View>
            )}

            {/* Forward tag */}
            {item.forwardFrom && (
              <Text style={{ color: isMine ? '#DBEAFE' : colors.muted, fontSize: 11, marginBottom: 4, fontStyle: 'italic' }}>↗ Chuyển tiếp</Text>
            )}

            {/* Text content */}
            {item.content ? (
              <Text style={{ color: isMine ? '#fff' : colors.text, fontSize: 16, lineHeight: 22 }}>{item.content}</Text>
            ) : null}

            {/* Reactions */}
            {!!item.reactions?.length && (
              <Text style={{ marginTop: 4, fontSize: 14 }}>{item.reactions.map((r) => r.emoji).join(' ')}</Text>
            )}

            {/* Media attachments */}
            {!!item.mediaIds?.length && (
              <View style={{ marginTop: item.content ? 8 : 0, gap: 6 }}>
                {item.mediaIds.map((mediaId, idx) => {
                  const media = mediaById[mediaId];
                  const isImage = isImageMimeType(media?.mimeType);
                  const fileName = media?.fileName || `Tệp đính kèm ${idx + 1}`;
                  const canOpen = !!media?.url;

                  if (isImage && media?.url) {
                    return (
                      <TouchableOpacity key={`${mediaId}-${idx}`} onPress={() => setViewImageUrl(media.url)} activeOpacity={0.9}>
                        <Image
                          source={{ uri: media.url }}
                          style={styles.inlineImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  }

                  return (
                    <TouchableOpacity
                      key={`${mediaId}-${idx}`}
                      disabled={!canOpen}
                      onPress={async () => {
                        if (!media?.url) return;
                        const supported = await Linking.canOpenURL(media.url);
                        if (supported) await Linking.openURL(media.url);
                        else Alert.alert('Lỗi', 'Không thể mở tệp');
                      }}
                      style={[styles.fileAttachment, { backgroundColor: isMine ? '#1D4ED8' : colors.border }]}
                    >
                      <Ionicons name="document-attach-outline" size={18} color={isMine ? '#DBEAFE' : colors.text} />
                      <Text numberOfLines={1} style={{ flex: 1, color: isMine ? '#DBEAFE' : colors.text, fontSize: 13, fontWeight: '600' }}>
                        {fileName}
                      </Text>
                      {canOpen && <Ionicons name="download-outline" size={16} color={isMine ? '#DBEAFE' : colors.muted} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Time + Status */}
            <View style={[styles.msgMeta, { justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
              <Text style={{ color: isMine ? 'rgba(255,255,255,0.5)' : colors.muted, fontSize: 10 }}>
                {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMine && <View style={{ marginLeft: 4 }}>{renderMessageStatus(item)}</View>}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image source={{ uri: headerAvatarUrl }} style={{ width: 34, height: 34, borderRadius: 17 }} />
              <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }} numberOfLines={1}>
                {conversationTitle}
              </Text>
            </View>
          ),
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: 4 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={handleOpenConversationOptions} style={{ padding: 8, marginRight: 6 }}>
              <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Socket offline banner */}
      {!isSocketReady && (
        <View style={{ paddingVertical: 5, backgroundColor: colorScheme === 'dark' ? '#78350F' : '#FEF3C7', alignItems: 'center' }}>
          <Text style={{ color: colorScheme === 'dark' ? '#FDE68A' : '#92400E', fontSize: 11 }}>Đang kết nối...</Text>
        </View>
      )}

      {/* Pinned message */}
      {conversation?.type === 'group' && pinnedItems.length > 0 && (
        <PinnedBar 
          pinnedItems={pinnedItems}
          colors={colors}
          brand="#0068FF"
          onPress={() => router.push({ pathname: '/pinned-messages', params: { id: conversationId } } as any)}
        />
      )}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          data={messages}
          keyExtractor={(item) => getMessageId(item)}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          inverted
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null}
          contentContainerStyle={{ paddingVertical: 8 }}
        />
        <TypingIndicator isVisible={typingParticipants.length > 0} text={typingText} />

        {/* Emoji panel */}
        {showEmojiPanel && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.surface }}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity key={emoji} onPress={() => setInputText((prev) => `${prev}${emoji}`)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.tint + '20' }}>
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Reply preview */}
        {replyTo && (
          <View style={[styles.replyPreview, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <View style={[styles.replyPreviewBar, { backgroundColor: colors.tint }]} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '700' }}>
                Trả lời: {typeof (replyTo as any).senderId === 'object' ? (replyTo as any).senderId?.username : 'tin nhắn'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}>{replyTo.content || 'File đính kèm'}</Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: 6 }}>
              <Ionicons name="close" size={18} color={colors.muted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(12, insets.bottom) }]}>
          <TouchableOpacity onPress={() => setShowEmojiPanel((prev) => !prev)} style={styles.iconBtn}>
            <Ionicons name={showEmojiPanel ? 'happy' : 'happy-outline'} size={24} color={showEmojiPanel ? colors.tint : colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowMediaMenu(true)} style={styles.iconBtn}>
            <Ionicons name="add-circle-outline" size={26} color={colors.muted} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
            placeholder="Nhắn tin..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={handleInputChange}
            multiline
            onBlur={stopTypingWithEmit}
          />

          <TouchableOpacity
            onPress={handleSendText}
            disabled={isSending || inputText.trim().length === 0}
            style={[styles.sendBtn, { backgroundColor: inputText.trim().length > 0 ? '#0068FF' : '#D1D5DB' }]}
          >
            {isSending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Media menu modal */}
      <Modal visible={showMediaMenu} transparent animationType="fade" onRequestClose={() => setShowMediaMenu(false)}>
        <TouchableOpacity style={styles.mediaMenuOverlay} activeOpacity={1} onPress={() => setShowMediaMenu(false)}>
          <View style={[styles.mediaMenu, { backgroundColor: colors.surface }]}>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={handlePickImage}>
              <View style={[styles.mediaMenuIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="image" size={26} color="#4F46E5" />
              </View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 4 }}>Thư viện ảnh</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.mediaMenuItem} onPress={handleDocumentPick}>
              <View style={[styles.mediaMenuIcon, { backgroundColor: '#ECFDF5' }]}>
                <Ionicons name="document-attach" size={26} color="#10B981" />
              </View>
              <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 4 }}>Tệp tài liệu</Text>
            </TouchableOpacity>
            
            {conversation?.type === 'group' && (
              <TouchableOpacity 
                style={styles.mediaMenuItem} 
                onPress={() => {
                  setShowMediaMenu(false);
                  router.push({ pathname: '/create-poll', params: { conversationId } } as any);
                }}
              >
                <View style={[styles.mediaMenuIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="stats-chart" size={26} color="#D97706" />
                </View>
                <Text style={{ color: colors.text, fontSize: 13, fontWeight: '600', marginTop: 4 }}>Bình chọn</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Image viewer */}
      <Modal visible={!!viewImageUrl} transparent animationType="fade" onRequestClose={() => setViewImageUrl(null)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setViewImageUrl(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {viewImageUrl && (
            <Image source={{ uri: viewImageUrl }} style={styles.imageViewerImg} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Forward modal */}
      <Modal visible={forwardModalVisible} animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface }}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Chuyển tiếp</Text>
            <View style={{ width: 36 }} />
          </View>
          <FlatList
            data={conversations}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <TouchableOpacity
                disabled={isForwarding}
                onPress={() => handleForward(item._id || item.id || '')}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{getConversationTitle(item, currentUserId)}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Custom Action Menu for Message Long Press */}
      <Modal visible={actionMenu.visible} transparent animationType="fade" onRequestClose={() => setActionMenu({ visible: false, options: [] })}>
        <TouchableOpacity style={styles.actionMenuOverlay} activeOpacity={1} onPress={() => setActionMenu({ visible: false, options: [] })}>
          <View style={[styles.actionMenuContainer, { backgroundColor: colors.surface }]}>
            {actionMenu.options.map((opt, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.actionMenuBtn, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}
                onPress={() => {
                  setActionMenu({ visible: false, options: [] });
                  opt.onPress();
                }}
              >
                <Text style={{ fontSize: 16, color: opt.isDestructive ? '#EF4444' : colors.text, fontWeight: opt.style === 'cancel' ? '700' : '400' }}>
                  {opt.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: { flexDirection: 'row', marginVertical: 2, marginHorizontal: 12, alignItems: 'flex-end' },
  myWrapper: { justifyContent: 'flex-end' },
  theirWrapper: { justifyContent: 'flex-start' },
  senderAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6, marginBottom: 2 },
  bubble: { borderRadius: 18, padding: 10, maxWidth: '100%' },
  replyQuote: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6, opacity: 0.85 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  inlineImage: { width: 200, height: 160, borderRadius: 12 },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  replyPreview: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  replyPreviewBar: { width: 3, height: '100%', borderRadius: 2, minHeight: 30 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  iconBtn: { padding: 4 },
  textInput: { flex: 1, borderWidth: 1, borderRadius: 22, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, maxHeight: 100 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  mediaMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  mediaMenu: { flexDirection: 'row', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 20 },
  mediaMenuItem: { alignItems: 'center', flex: 1 },
  mediaMenuIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  imageViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  imageViewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 8 },
  imageViewerImg: { width: '100%', height: '80%' },
  actionMenuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end', padding: 16 },
  actionMenuContainer: { borderRadius: 14, overflow: 'hidden', paddingBottom: Platform.OS === 'ios' ? 20 : 0 },
  actionMenuBtn: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});

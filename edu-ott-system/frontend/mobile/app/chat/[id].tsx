import { useState, useEffect, useCallback } from 'react';
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
  ActionSheetIOS,
  Modal,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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
  createConversation,
  pinGroupMessage,
  unpinGroupMessage,
  updateConversationPreference,
} from '../../utils/messageService';
import { uploadMediaBase64 } from '../../utils/mediaService';
import { getMediaById } from '../../utils/mediaService';
import { connectSocket, getSocket, joinConversation } from '../../utils/socketService';
import type { Message, Conversation, MediaItem } from '../../types/chat';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

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

  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [mediaById, setMediaById] = useState<Record<string, MediaItem>>({});
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorPlaceholder, setEditorPlaceholder] = useState('');
  const [editorValue, setEditorValue] = useState('');
  const [editorSubmit, setEditorSubmit] = useState<null | ((value: string) => void)>(null);
  const [commonGroupsVisible, setCommonGroupsVisible] = useState(false);
  const [commonGroups, setCommonGroups] = useState<Conversation[]>([]);

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

  const openTextEditor = (
    title: string,
    placeholder: string,
    onSubmit: (value: string) => void,
    defaultValue: string = '',
  ) => {
    setEditorTitle(title);
    setEditorPlaceholder(placeholder);
    setEditorValue(defaultValue);
    setEditorSubmit(() => onSubmit);
    setEditorVisible(true);
  };

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

      const onConnect = () => {
        setIsSocketReady(true);
        joinConversation(conversationId);
      };
      const onDisconnect = () => setIsSocketReady(false);

      const onNewMessage = (message: Message) => {
        const messageConversationId = getConversationIdFromMessage(message);
        if (messageConversationId !== conversationId) return;
        setMessages((prev) =>
          prev.some((m) => getMessageId(m) === getMessageId(message))
            ? prev
            : [message, ...prev],
        );
        if (getMessageSenderId(message) !== currentUserId) {
          markMessageRead(getMessageId(message)).catch(() => null);
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
              ? {
                ...m,
                seenBy: Array.from(new Set([...(m.seenBy || []), payload.userId])),
                deliveredTo: Array.from(new Set([...(m.deliveredTo || []), payload.userId])),
              }
              : m,
          ),
        );
      };

      const onMessageDelivered = (payload: { messageId: string; userId: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            getMessageId(m) === payload.messageId
              ? {
                ...m,
                deliveredTo: Array.from(new Set([...(m.deliveredTo || []), payload.userId])),
              }
              : m,
          ),
        );
      };

      const onMessageReacted = (payload: { messageId: string; reactions: Message['reactions'] }) => {
        setMessages((prev) =>
          prev.map((m) =>
            getMessageId(m) === payload.messageId
              ? { ...m, reactions: payload.reactions || [] }
              : m,
          ),
        );
      };

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);
      socket.on('new_message', onNewMessage);
      socket.on('message_recalled', onMessageRecalled);
      socket.on('message_seen', onMessageSeen);
      socket.on('message_delivered', onMessageDelivered);
      socket.on('message_reacted', onMessageReacted);

      return () => {
        socket.off('connect', onConnect);
        socket.off('disconnect', onDisconnect);
        socket.off('new_message', onNewMessage);
        socket.off('message_recalled', onMessageRecalled);
        socket.off('message_seen', onMessageSeen);
        socket.off('message_delivered', onMessageDelivered);
        socket.off('message_reacted', onMessageReacted);
      };
    };

    const cleanupPromise = setupSocket();
    return () => {
      mounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
      if (socketRef) {
        socketRef.off('new_message');
        socketRef.off('message_recalled');
        socketRef.off('message_seen');
        socketRef.off('message_delivered');
        socketRef.off('message_reacted');
      }
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

    setIsSending(true);
    try {
      const newMsg = await sendMessage({
        conversationId,
        content: text,
      });
      setMessages((prev) =>
        prev.some((m) => getMessageId(m) === getMessageId(newMsg))
          ? prev
          : [newMsg, ...prev],
      );
      const socket = getSocket();
      if (!socket?.connected) {
        Alert.alert('Đã gửi qua API', 'Tin nhắn đã gửi. Realtime sẽ đồng bộ khi socket kết nối lại.');
      }
      setInputText('');
      setShowEmojiPanel(false);
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn');
    } finally {
      setIsSending(false);
    }
  };

  const handleDocumentPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      setIsSending(true);

      try {
        const base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const media = await uploadMediaBase64({
          fileName: asset.name,
          mimeType: asset.mimeType || 'application/octet-stream',
          contentBase64: base64,
        });

        const newMsg = await sendMessage({
          conversationId,
          mediaIds: [media._id],
          content: `Đã gửi file: ${asset.name}`,
        });
        setMessages((prev) =>
          prev.some((m) => getMessageId(m) === getMessageId(newMsg))
            ? prev
            : [newMsg, ...prev],
        );
        const socket = getSocket();
        if (!socket?.connected) {
          Alert.alert('Đã gửi file', 'File đã gửi qua API. Realtime sẽ cập nhật khi socket ổn định.');
        }
      } catch (uploadErr) {
        console.log(uploadErr);
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
      const fallbackContent =
        forwardSource.content?.trim() || (forwardSource.mediaIds?.length ? 'Tin nhắn được chuyển tiếp' : '');
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
    const options = [...QUICK_EMOJIS, 'Gỡ cảm xúc', 'Hủy'];
    Alert.alert(
      'Chọn cảm xúc',
      '',
      options.map((emoji) => ({
        text: emoji,
        onPress: async () => {
          if (emoji === 'Hủy') return;
          try {
            const reactions = await reactToMessage(
              getMessageId(msg),
              emoji === 'Gỡ cảm xúc' ? undefined : emoji,
            );
            setMessages((prev) =>
              prev.map((m) =>
                getMessageId(m) === getMessageId(msg)
                  ? { ...m, reactions: reactions || [] }
                  : m,
              ),
            );
          } catch (_e) {
            Alert.alert('Lỗi', 'Không thể thả cảm xúc');
          }
        },
      })),
    );
  };

  const loadCommonGroupsWithUser = async () => {
    if (!otherParticipant) return;
    const otherUserId = getUserId(otherParticipant);
    const allConversations = conversations.length ? conversations : (await getConversations(null, 100)).items || [];
    const sharedGroups = allConversations.filter((conv) => {
      if (conv.type !== 'group') return false;
      const participantIds = (conv.participants || []).map((p) => getUserId(p));
      return participantIds.includes(currentUserId) && participantIds.includes(otherUserId);
    });
    setCommonGroups(sharedGroups);
    setCommonGroupsVisible(true);
  };

  const handleOpenConversationOptions = () => {
    if (!conversation) return;
    const options = ['Hủy'];
    const actions: Array<() => void> = [() => { }];

    options.push('Đặt biệt danh');
    actions.push(() =>
      openTextEditor(
        'Đặt biệt danh cuộc trò chuyện',
        'Nhập biệt danh',
        (value) =>
          void (async () => {
            try {
              await updateConversationPreference(conversationId, { nickname: value });
              setConversation((prev) =>
                prev
                  ? { ...prev, preference: { ...(prev.preference || {}), nickname: value } }
                  : prev,
              );
            } catch (e: any) {
              Alert.alert('Lỗi', e.message || 'Không thể cập nhật biệt danh');
            }
          })(),
        conversation.preference?.nickname || '',
      ),
    );

    if (conversation.type === 'direct' && otherParticipant) {
      options.push('Xem nhóm chung');
      actions.push(() => {
        void loadCommonGroupsWithUser();
      });

      options.push('Tạo nhóm với người này');
      actions.push(() =>
        openTextEditor(
          'Tạo nhóm',
          'Nhập tên nhóm',
          (value) =>
            void (async () => {
              try {
                const created = await createConversation({
                  type: 'group',
                  name: value,
                  participantIds: [getUserId(otherParticipant)],
                });
                const newId = created._id || created.id;
                if (newId) router.push(`/chat/${newId}`);
              } catch (e: any) {
                Alert.alert('Lỗi', e.message || 'Không thể tạo nhóm');
              }
            })(),
          `Nhóm với ${otherParticipant.username || 'bạn'}`,
        ),
      );
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 0 }, (idx) => {
        actions[idx]?.();
      });
      return;
    }

    Alert.alert(
      'Tùy chọn cuộc trò chuyện',
      '',
      options.map((text, idx) => ({
        text,
        style: idx === 0 ? 'cancel' : 'default',
        onPress: actions[idx],
      })),
    );
  };

  const handleMessageLongPress = (msg: Message) => {
    const isMine = getMessageSenderId(msg) === currentUserId;
    const options = ['Hủy'];
    const actions: Array<() => void> = [() => { }];
    const isGroup = conversation?.type === 'group';

    if (isMine && !msg.isRecalled) {
      options.push('Thu hồi tin nhắn');
      actions.push(async () => {
        try {
          await recallMessage(getMessageId(msg));
          setMessages((prev) =>
            prev.map((m) => (getMessageId(m) === getMessageId(msg) ? { ...m, isRecalled: true } : m)),
          );
        } catch (_e) {
          Alert.alert('Lỗi', 'Không thể thu hồi tin nhắn');
        }
      });
    }

    if (!msg.isRecalled) {
      options.push('Xóa tin nhắn phía tôi');
      actions.push(async () => {
        try {
          await deleteMessage(getMessageId(msg));
          setMessages((prev) => prev.filter((m) => getMessageId(m) !== getMessageId(msg)));
        } catch (_e) {
          Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
        }
      });
    }

    if (!msg.isRecalled) {
      options.push('Thả cảm xúc');
      actions.push(() => {
        handleReactToMessage(msg);
      });
    }

    if (!msg.isRecalled) {
      options.push('Chuyển tiếp');
      actions.push(() => {
        openForwardModal(msg);
      });
    }
    if (isGroup && !msg.isRecalled) {
      options.push('Ghim tin nhắn');
      actions.push(async () => {
        try {
          const updated = await pinGroupMessage(conversationId, getMessageId(msg));
          setConversation(updated);
          Alert.alert('Thành công', 'Đã ghim tin nhắn');
        } catch (_e) {
          Alert.alert('Lỗi', 'Không thể ghim tin nhắn');
        }
      });
    }

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 0 },
        (buttonIndex) => {
          actions[buttonIndex]();
        },
      );
    } else {
      Alert.alert(
        'Tùy chọn tin nhắn',
        '',
        options.map((btn, idx) => ({
          text: btn,
          onPress: actions[idx],
          style: idx === 0 ? 'cancel' : 'default',
        })),
      );
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = getMessageSenderId(item) === currentUserId;
    const senderName = typeof item.senderId === 'string' ? 'Khách' : item.senderId?.username || 'Khách';

    if (item.isRecalled) {
      return (
        <View
          style={[
            { padding: 10, marginVertical: 4, marginHorizontal: 16, borderRadius: 16, maxWidth: '75%' },
            isMine
              ? { alignSelf: 'flex-end', backgroundColor: colors.surface }
              : { alignSelf: 'flex-start', backgroundColor: colors.surface },
          ]}
        >
          <Text style={{ color: '#94A3B8', fontStyle: 'italic' }}>Tin nhắn đã bị thu hồi</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        onLongPress={() => handleMessageLongPress(item)}
        activeOpacity={0.85}
        style={[
          { padding: 12, marginVertical: 4, marginHorizontal: 16, borderRadius: 16, maxWidth: '75%' },
          isMine
            ? { alignSelf: 'flex-end', backgroundColor: '#0068FF', borderBottomRightRadius: 4 }
            : { alignSelf: 'flex-start', backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
        ]}
      >
        {!isMine && <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{senderName}</Text>}
        {item.forwardFrom && (
          <Text style={{ color: isMine ? '#DBEAFE' : '#64748B', fontSize: 12, marginBottom: 6 }}>Tin nhắn chuyển tiếp</Text>
        )}
        {item.content ? <Text style={{ color: isMine ? '#fff' : colors.text, fontSize: 16 }}>{item.content}</Text> : null}
        {!!item.reactions?.length && (
          <Text style={{ marginTop: 6, color: isMine ? '#DBEAFE' : '#475569', fontSize: 13 }}>
            {item.reactions.map((r) => r.emoji).join(' ')}
          </Text>
        )}
        {!!item.mediaIds?.length && (
          <View style={{ marginTop: 8, gap: 6 }}>
            {item.mediaIds.map((mediaId, idx) => {
              const media = mediaById[mediaId];
              const fileName = media?.fileName || `Tệp đính kèm ${idx + 1}`;
              const canOpen = !!media?.url;
              return (
                <TouchableOpacity
                  key={`${mediaId}-${idx}`}
                  disabled={!canOpen}
                  onPress={async () => {
                    if (!media?.url) return;
                    const supported = await Linking.canOpenURL(media.url);
                    if (supported) {
                      await Linking.openURL(media.url);
                    } else {
                      Alert.alert('Lỗi', 'Không thể mở tệp này trên thiết bị');
                    }
                  }}
                  style={{
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    backgroundColor: isMine ? '#1D4ED8' : colors.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    opacity: canOpen ? 1 : 0.7,
                  }}
                >
                  <Ionicons name="document-attach-outline" size={16} color={isMine ? '#DBEAFE' : '#334155'} />
                  <Text
                    numberOfLines={1}
                    style={{ flex: 1, color: isMine ? '#DBEAFE' : '#334155', fontSize: 12, fontWeight: '600' }}
                  >
                    {fileName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </TouchableOpacity>
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
          title: conversationTitle,
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

      {!isSocketReady && (
        <View style={{ paddingVertical: 6, backgroundColor: colorScheme === 'dark' ? '#78350F' : '#FEF3C7', alignItems: 'center' }}>
          <Text style={{ color: colorScheme === 'dark' ? '#FDE68A' : '#92400E', fontSize: 12 }}>Đang thiết lập kết nối chat...</Text>
        </View>
      )}
      {conversation?.type === 'group' && conversation?.pinnedMessageId && (
        <View style={{ paddingVertical: 8, backgroundColor: colorScheme === 'dark' ? '#1E3A5F' : '#EEF4FF', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="pin" size={14} color={colors.tint} />
          <Text style={{ color: colors.tint, fontSize: 12 }}>Nhóm đang có tin nhắn ghim</Text>
          <TouchableOpacity
            onPress={async () => {
              try {
                const updated = await unpinGroupMessage(conversationId);
                setConversation(updated);
              } catch (_e) {
                Alert.alert('Lỗi', 'Không thể bỏ ghim');
              }
            }}
          >
            <Text style={{ color: colors.tint, fontWeight: '700', fontSize: 12 }}>Bỏ ghim</Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => getMessageId(item)}
          renderItem={renderMessage}
          keyboardShouldPersistTaps="handled"
          inverted
          onEndReached={loadMoreMessages}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null}
        />

        {showEmojiPanel && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: colors.surface }}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setInputText((prev) => `${prev}${emoji}`)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: colors.tint + '20' }}
              >
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 12,
            paddingBottom: Math.max(12, insets.bottom),
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.border,
            backgroundColor: colors.surface,
          }}
        >
          <TouchableOpacity onPress={() => setShowEmojiPanel((prev) => !prev)} style={{ marginRight: 10 }}>
            <Ionicons name="happy-outline" size={24} color={colors.muted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDocumentPick} style={{ marginRight: 10 }}>
            <Ionicons name="attach" size={24} color={colors.muted} />
          </TouchableOpacity>

          <TextInput
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 16,
              maxHeight: 100,
              color: colors.text,
            }}
            placeholder="Nhắn tin..."
            placeholderTextColor={colors.muted}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity
            onPress={handleSendText}
            disabled={isSending || inputText.trim().length === 0}
            style={{
              marginLeft: 12,
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: inputText.trim().length > 0 ? '#0068FF' : '#D1D5DB',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={forwardModalVisible} animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface }}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Chuyển tiếp tin nhắn</Text>
            <View style={{ width: 36 }} />
          </View>

          <FlatList
            data={conversations}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.muted }}>Không có cuộc trò chuyện phù hợp</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                disabled={isForwarding}
                onPress={() => handleForward(item._id || item.id || '')}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{getConversationTitle(item, user?.id || '')}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={commonGroupsVisible} animationType="slide" onRequestClose={() => setCommonGroupsVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface }}>
            <TouchableOpacity onPress={() => setCommonGroupsVisible(false)}>
              <Text style={{ color: colors.tint, fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>Nhóm chung</Text>
            <View style={{ width: 36 }} />
          </View>
          <FlatList
            data={commonGroups}
            keyExtractor={(item) => item._id || item.id || String(Math.random())}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: colors.muted }}>Chưa có nhóm chung</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setCommonGroupsVisible(false);
                  router.push(`/chat/${item._id || item.id}`);
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.surface }}
              >
                <Text style={{ fontSize: 16, color: colors.text }}>{item.name || 'Nhóm chat'}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 20, gap: 14, backgroundColor: colors.surface }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{editorTitle}</Text>
            <TextInput
              value={editorValue}
              onChangeText={setEditorValue}
              placeholder={editorPlaceholder}
              placeholderTextColor={colors.muted}
              style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, fontSize: 16, backgroundColor: colors.background }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setEditorVisible(false)} style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const value = editorValue.trim();
                  if (!value || !editorSubmit) return;
                  setEditorVisible(false);
                  editorSubmit(value);
                }}
                style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.tint }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Lưu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

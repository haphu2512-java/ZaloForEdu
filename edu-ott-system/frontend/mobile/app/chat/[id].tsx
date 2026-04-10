import React, { useState, useEffect, useCallback } from 'react';
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
  uploadMedia,
  getConversations,
} from '../../utils/messageService';
import { connectSocket, getSocket, joinConversation } from '../../utils/socketService';
import type { Message, Conversation } from '../../types/chat';

const QUICK_EMOJIS = ['😀', '😂', '😍', '🥰', '👍', '❤️', '🔥', '😭', '🙏', '🎉'];

function getMessageSenderId(msg: Message): string {
  if (typeof msg.senderId === 'string') return msg.senderId;
  return msg.senderId?._id || '';
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

  const [messages, setMessages] = useState<Message[]>([]);
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

  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMessages({ conversationId, limit: 30 });
      setMessages(res.items);
      setNextCursor(res.nextCursor);
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
        if (getMessageSenderId(message) !== user?.id) {
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
  }, [conversationId, user?.id]);

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

        const media = await uploadMedia({
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
      const res = await getConversations(1, 50);
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

  const handleMessageLongPress = (msg: Message) => {
    const isMine = getMessageSenderId(msg) === user?.id;
    const options = ['Hủy'];
    const actions: Array<() => void> = [() => {}];

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
    const isMine = getMessageSenderId(item) === user?.id;
    const senderName = typeof item.senderId === 'string' ? 'Khách' : item.senderId?.username || 'Khách';

    if (item.isRecalled) {
      return (
        <View
          style={[
            { padding: 10, marginVertical: 4, marginHorizontal: 16, borderRadius: 16, maxWidth: '75%' },
            isMine
              ? { alignSelf: 'flex-end', backgroundColor: '#F1F5F9' }
              : { alignSelf: 'flex-start', backgroundColor: '#F1F5F9' },
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
            ? { alignSelf: 'flex-end', backgroundColor: '#3B82F6', borderBottomRightRadius: 4 }
            : { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
        ]}
      >
        {!isMine && <Text style={{ fontSize: 12, color: '#64748B', marginBottom: 4 }}>{senderName}</Text>}
        {item.forwardFrom && (
          <Text style={{ color: isMine ? '#DBEAFE' : '#64748B', fontSize: 12, marginBottom: 6 }}>Tin nhắn chuyển tiếp</Text>
        )}
        {item.content ? <Text style={{ color: isMine ? '#fff' : '#0F172A', fontSize: 16 }}>{item.content}</Text> : null}
        {!!item.reactions?.length && (
          <Text style={{ marginTop: 6, color: isMine ? '#DBEAFE' : '#475569', fontSize: 13 }}>
            {item.reactions.map((r) => r.emoji).join(' ')}
          </Text>
        )}
        {!!item.mediaIds?.length && (
          <Text style={{ marginTop: 6, color: isMine ? '#DBEAFE' : '#475569', fontSize: 12 }}>
            Đính kèm {item.mediaIds.length} file
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Stack.Screen
        options={{
          title: 'Trò chuyện',
          headerShown: true,
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: 4 }}>
              <Ionicons name="arrow-back" size={26} color="#0F172A" />
            </TouchableOpacity>
          ),
        }}
      />

      {!isSocketReady && (
        <View style={{ paddingVertical: 8, backgroundColor: '#FEF3C7', alignItems: 'center' }}>
          <Text style={{ color: '#92400E', fontSize: 12 }}>Đang thiết lập kết nối chat...</Text>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#F8FAFC' }}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setInputText((prev) => `${prev}${emoji}`)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#EEF2FF' }}
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
            borderTopWidth: 1,
            borderTopColor: '#E2E8F0',
            backgroundColor: '#F8FAFC',
          }}
        >
          <TouchableOpacity onPress={() => setShowEmojiPanel((prev) => !prev)} style={{ marginRight: 10 }}>
            <Ionicons name="happy-outline" size={26} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDocumentPick} style={{ marginRight: 10 }}>
            <Ionicons name="attach" size={26} color="#64748B" />
          </TouchableOpacity>

          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#E2E8F0',
              borderRadius: 24,
              paddingHorizontal: 16,
              paddingTop: 10,
              paddingBottom: 10,
              fontSize: 16,
              maxHeight: 100,
            }}
            placeholder="Nhắn tin..."
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
              backgroundColor: inputText.trim().length > 0 ? '#3B82F6' : '#CBD5E1',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isSending ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={20} color="#fff" style={{ marginLeft: 4 }} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={forwardModalVisible} animationType="slide" onRequestClose={() => setForwardModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setForwardModalVisible(false)}>
              <Text style={{ color: '#3B82F6', fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Chuyển tiếp tin nhắn</Text>
            <View style={{ width: 36 }} />
          </View>

          <FlatList
            data={conversations}
            keyExtractor={(item) => item._id}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: '#64748B' }}>Không có cuộc trò chuyện phù hợp</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                disabled={isForwarding}
                onPress={() => handleForward(item._id || item.id || '')}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
              >
                <Text style={{ fontSize: 16, color: '#0F172A' }}>{getConversationTitle(item, user?.id || '')}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

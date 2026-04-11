<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/chat/[id].tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Text,
  StyleSheet,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import type { Message, RoomModel } from '@/types/chat';
import * as messageService from '@/utils/messageService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ReactionPicker } from '@/components/chat/ReactionPicker';
import { useAuth } from '@/context/auth';
import { connectSocket, getSocket, joinRoom, leaveRoom, emitTypingStart, emitTypingStop } from '@/utils/socketService';

// ============================================================
// ChatDetailScreen - Production-ready, tích hợp API backend
// Features: Infinite scroll, reply, reactions, mark as read,
//           edit/delete, typing indicator, error handling
// ============================================================

const PAGE_SIZE = 30;

export default function ChatDetailScreen() {
  const { user } = useAuth();
  const currentUserId = user?._id || '';
  const { id, name, avatar, roomModel } = useLocalSearchParams<{
    id: string;
    name: string;
    avatar: string;
    roomModel: string;
  }>();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);

  // --- State ---
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Reply state
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Reaction picker state
  const [reactionTarget, setReactionTarget] = useState<Message | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Real-time Socket Connection ---
  useEffect(() => {
    let active = true;

    const setupSocket = async () => {
      if (!id) return;
      
      const socket = await connectSocket();
      if (!socket || !active) return;

      joinRoom(id);

      // Listen for socket events
      const handleNewMessage = (msg: Message) => {
        // Prevent duplicate if we sent it (optimistic update sets temp ID, real response updates it, but socket also broadcasts)
        // Actually, backend broadcasts to `socket.to(roomId)`, so the sender doesn't get `message:new` via this event.
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        
        // Auto scroll to bottom
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Mark as read if not from us
        if (msg.sender?._id !== currentUserId) {
          messageService.markAsRead(msg._id).catch(() => {});
        }
      };

      const handleTypingStart = ({ fullName, userId }: { fullName?: string; userId?: string }) => {
        const typingKey = fullName || userId;
        if (!typingKey) return;
        setTypingUsers((prev) => new Set(prev).add(typingKey));
      };

      const handleTypingStop = ({ fullName, userId }: { fullName?: string; userId?: string }) => {
        const typingKey = fullName || userId;
        if (!typingKey) return;
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.delete(typingKey);
          return next;
        });
      };

      socket.on('message:new', handleNewMessage);
      socket.on('typing:start', handleTypingStart);
      socket.on('typing:stop', handleTypingStop);

      return () => {
        socket.off('message:new', handleNewMessage);
        socket.off('typing:start', handleTypingStart);
        socket.off('typing:stop', handleTypingStop);
        leaveRoom(id);
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/chat/[id].tsx
      };
    };

    const cleanupPromise = setupSocket();
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/chat/[id].tsx

    return () => {
      active = false;
      cleanupPromise.then((cleanup) => cleanup && cleanup());
    };
  }, [id, currentUserId]);

  // --- Fetch messages ---
  const fetchMessages = useCallback(
    async (pageNum: number, prepend = false) => {
      if (!id) return;

      try {
        const response = await messageService.getMessages({
          roomId: id,
          roomModel: (roomModel as RoomModel) || 'Conversation',
          page: pageNum,
          limit: PAGE_SIZE,
        });

        const newMessages = response.data.messages;

        if (prepend) {
          setMessages((prev) => [...newMessages, ...prev]);
        } else {
          setMessages(newMessages);
        }

        setHasMore(newMessages.length === PAGE_SIZE);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch messages:', err);
        setError(err.message || 'Không thể tải tin nhắn');
      }
    },
    [id, roomModel]
  );

  // Initial load
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchMessages(1);
      setIsLoading(false);
    };
    load();
  }, [fetchMessages]);

  // --- Infinite scroll (load older messages) ---
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchMessages(nextPage, true);
    setPage(nextPage);
    setIsLoadingMore(false);
  }, [isLoadingMore, hasMore, page, fetchMessages]);

  // --- Send message ---
  const handleSendMessage = useCallback(
    async (content: string, attachments?: any[], replyToId?: string) => {
      if (!id) return;

      // Optimistic update
      const optimisticMsg: Message = {
        _id: `temp-${Date.now()}`,
        content,
        type: 'text',
        sender: { _id: currentUserId, fullName: user?.fullName || 'Tôi' },
        room: id,
        roomModel: (roomModel as RoomModel) || 'Conversation',
        attachments: attachments || [],
        isEdited: false,
        isDeleted: false,
        replyTo: replyingTo || undefined,
        readBy: [],
        reactions: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'sending',
      };

      setMessages((prev) => [...prev, optimisticMsg]);
      setReplyingTo(null);

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      try {
        const response = await messageService.sendMessage({
          content,
          roomId: id,
          roomModel: (roomModel as RoomModel) || 'Conversation',
          attachments,
          replyTo: replyToId,
        });

        // Replace optimistic message with real one
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === optimisticMsg._id
              ? { ...response.data.message, status: 'sent' as const }
              : msg
          )
        );
      } catch (err: any) {
        // Mark as failed
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === optimisticMsg._id
              ? { ...msg, status: 'failed' as const }
              : msg
          )
        );
        Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    },
    [id, roomModel, replyingTo, currentUserId, user]
  );

  // --- Long press actions ---
  const handleLongPress = useCallback((message: Message) => {
    const isMyMessage = message.sender?._id === currentUserId;

    const buttons: any[] = [
      {
        text: 'Trả lời',
        onPress: () => setReplyingTo(message),
      },
      {
        text: 'Thả cảm xúc',
        onPress: () => {
          setReactionTarget(message);
          setShowReactionPicker(true);
        },
      },
    ];

    if (isMyMessage) {
      buttons.push({
        text: 'Xóa tin nhắn',
        style: 'destructive' as const,
        onPress: async () => {
          try {
            await messageService.deleteMessage(message._id);
            setMessages((prev) =>
              prev.map((msg) =>
                msg._id === message._id ? { ...msg, isDeleted: true } : msg
              )
            );
          } catch {
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn');
          }
        },
      });
    }

    buttons.push({ text: 'Huỷ', style: 'cancel' as const });

    Alert.alert('Tuỳ chọn tin nhắn', undefined, buttons);
  }, [currentUserId]);

  // --- Reaction ---
  const handleReaction = useCallback(
    async (emoji: string) => {
      if (!reactionTarget) return;
      setShowReactionPicker(false);

      try {
        const response = await messageService.addReaction(reactionTarget._id, { emoji });
        setMessages((prev) =>
          prev.map((msg) =>
            msg._id === reactionTarget._id ? response.data.message : msg
          )
        );
      } catch {
        Alert.alert('Lỗi', 'Không thể thêm cảm xúc');
      }

      setReactionTarget(null);
    },
    [reactionTarget]
  );

  // --- Mark as read ---
  const handleViewableItemsChanged = useCallback(
    ({ viewableItems }: any) => {
      viewableItems?.forEach((item: any) => {
        const msg = item.item as Message;
        if (msg.sender?._id !== currentUserId) {
          const alreadyRead = msg.readBy?.some((r) => r.user === currentUserId);
          if (!alreadyRead) {
            messageService.markAsRead(msg._id).catch(() => {});
          }
        }
      });
    },
    [currentUserId]
  );

  // --- Render ---
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isMe={item.sender?._id === currentUserId}
        currentUserId={currentUserId}
        onLongPress={handleLongPress}
        onReplyPress={(msg) => setReplyingTo(msg)}
        onReactionPress={(msg) => {
          setReactionTarget(msg);
          setShowReactionPicker(true);
        }}
      />
    ),
    [handleLongPress, currentUserId]
  );

  const renderHeader = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <ChatHeader
        name={(name as string) || 'Chat'}
        avatar={avatar as string}
        isOnline={true}
        onBackPress={() => router.back()}
        onCallPress={() => {}}
        onVideoPress={() => {}}
        onInfoPress={() => {}}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex1}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Loading state */}
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : messages.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
            <Text style={styles.emptySubtext}>Hãy gửi tin nhắn đầu tiên!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{ paddingVertical: 8 }}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            onContentSizeChange={() => {
              if (page === 1) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
            onViewableItemsChanged={handleViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Typing indicator */}
        <TypingIndicator
          isVisible={typingUsers.size > 0}
          text={
            typingUsers.size === 1
              ? `${Array.from(typingUsers)[0]} đang nhập tin nhắn...`
              : `${typingUsers.size} người đang nhập tin nhắn...`
          }
        />

        {/* Message input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          disabled={isLoading}
          onTyping={() => {
            if (id) {
              emitTypingStart(id);
              if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
              typingTimeoutRef.current = setTimeout(() => {
                emitTypingStop(id);
              }, 3000);
            }
          }}
        />
      </KeyboardAvoidingView>

      {/* Reaction Picker Modal */}
      <ReactionPicker
        visible={showReactionPicker}
        onSelect={handleReaction}
        onClose={() => {
          setShowReactionPicker(false);
          setReactionTarget(null);
        }}
        currentUserReaction={
          reactionTarget?.reactions?.find((r) => r.user === currentUserId)?.emoji
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  flex1: { flex: 1 },
  loadingMore: { paddingVertical: 16, alignItems: 'center' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  loadingText: { color: '#9CA3AF', marginTop: 8, fontSize: 14 },
  errorText: { color: '#EF4444', textAlign: 'center', fontSize: 15 },
  emptyText: { color: '#6B7280', fontSize: 17, fontWeight: '600', marginBottom: 4 },
  emptySubtext: { color: '#9CA3AF', fontSize: 14 },
});
=======
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
    const actions: Array<() => void> = [() => {}];

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
    const actions: Array<() => void> = [() => {}];
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
        {item.content ? <Text style={{ color: isMine ? '#fff' : '#0F172A', fontSize: 16 }}>{item.content}</Text> : null}
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
                    backgroundColor: isMine ? '#1D4ED8' : '#E5E7EB',
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0068FF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
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
        <View style={{ paddingVertical: 8, backgroundColor: '#FEF3C7', alignItems: 'center' }}>
          <Text style={{ color: '#92400E', fontSize: 12 }}>Đang thiết lập kết nối chat...</Text>
        </View>
      )}
      {conversation?.type === 'group' && conversation?.pinnedMessageId && (
        <View style={{ paddingVertical: 8, backgroundColor: '#EEF4FF', alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="pin" size={14} color="#0068FF" />
          <Text style={{ color: '#0068FF', fontSize: 12 }}>Nhóm đang có tin nhắn ghim</Text>
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
            <Text style={{ color: '#0068FF', fontWeight: '700', fontSize: 12 }}>Bỏ ghim</Text>
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
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 8, gap: 8, backgroundColor: '#F5F5F5' }}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                onPress={() => setInputText((prev) => `${prev}${emoji}`)}
                style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#EAF2FF' }}
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
            borderTopColor: '#EAEAEA',
            backgroundColor: '#FFFFFF',
          }}
        >
          <TouchableOpacity onPress={() => setShowEmojiPanel((prev) => !prev)} style={{ marginRight: 10 }}>
            <Ionicons name="happy-outline" size={24} color="#8A8A8A" />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDocumentPick} style={{ marginRight: 10 }}>
            <Ionicons name="attach" size={24} color="#8A8A8A" />
          </TouchableOpacity>

          <TextInput
            style={{
              flex: 1,
              backgroundColor: '#fff',
              borderWidth: 1,
              borderColor: '#EAEAEA',
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

      <Modal visible={commonGroupsVisible} animationType="slide" onRequestClose={() => setCommonGroupsVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={() => setCommonGroupsVisible(false)}>
              <Text style={{ color: '#0068FF', fontWeight: '700' }}>Đóng</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Nhóm chung</Text>
            <View style={{ width: 36 }} />
          </View>
          <FlatList
            data={commonGroups}
            keyExtractor={(item) => item._id || item.id || String(Math.random())}
            ListEmptyComponent={
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 }}>
                <Text style={{ color: '#64748B' }}>Chưa có nhóm chung</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setCommonGroupsVisible(false);
                  router.push(`/chat/${item._id || item.id}`);
                }}
                style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }}
              >
                <Text style={{ fontSize: 16, color: '#0F172A' }}>{item.name || 'Nhóm chat'}</Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={{ width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, gap: 12, backgroundColor: '#fff' }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#0F172A' }}>{editorTitle}</Text>
            <TextInput
              value={editorValue}
              onChangeText={setEditorValue}
              placeholder={editorPlaceholder}
              placeholderTextColor="#94A3B8"
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: '#0F172A', fontSize: 16 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity onPress={() => setEditorVisible(false)} style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#E5E7EB' }}>
                <Text style={{ color: '#374151', fontWeight: '700' }}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const value = editorValue.trim();
                  if (!value || !editorSubmit) return;
                  setEditorVisible(false);
                  editorSubmit(value);
                }}
                style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#0068FF' }}
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/chat/[id].tsx

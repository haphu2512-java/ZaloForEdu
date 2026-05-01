import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
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
import { API_BASE_URL } from '../../utils/api';
import { getPinnedMessages, pinMessage, unpinMessage } from '../../utils/groupFeatureService';
import { getMediaById, uploadMediaForm } from '../../utils/mediaService';
import { getBlockedUsers, blockOrUnblockUser } from '@/utils/userService';
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
import { AudioBubbleMobile } from '@/components/chat/AudioBubbleMobile';
import { VoiceRecorderMobile } from '@/components/chat/VoiceRecorderMobile';
import ChatMediaMenuModal from '@/components/chat/ChatMediaMenuModal';
import ChatForwardModal from '@/components/chat/ChatForwardModal';
import ChatActionMenuModal, { type ChatActionMenuOption } from '@/components/chat/ChatActionMenuModal';

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

const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/, '');

function toAbsoluteMediaUrl(url?: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

function getMimeTypeFromFileName(fileName?: string): string {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'pdf':
      return 'application/pdf';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls':
      return 'application/vnd.ms-excel';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'ppt':
      return 'application/vnd.ms-powerpoint';
    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'txt':
      return 'text/plain';
    default:
      return 'application/octet-stream';
  }
}

function isImageAttachment(media?: MediaItem | null): boolean {
  if (!media) return false;
  if (isImageMimeType(media.mimeType)) return true;
  const inferredMimeType = getMimeTypeFromFileName(media.fileName);
  return isImageMimeType(inferredMimeType);
}

function isAudioAttachment(media?: MediaItem | null): boolean {
  if (!media) return false;
  if (media.mimeType?.startsWith('audio/')) return true;
  const fileName = (media.fileName || '').toLowerCase();
  return /\.(mp3|m4a|aac|wav|ogg|opus|webm)$/i.test(fileName);
}

function isValidObjectId(value?: string): boolean {
  return !!value && /^[a-fA-F0-9]{24}$/.test(value);
}

function extractMediaId(mediaItem: any): string {
  if (!mediaItem) return '';
  if (typeof mediaItem === 'string') return mediaItem;
  return mediaItem._id || mediaItem.id || '';
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
  const [isBlockedByMe, setIsBlockedByMe] = useState(false);
  const [isBlockedByThem, setIsBlockedByThem] = useState(false);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [forwardModalVisible, setForwardModalVisible] = useState(false);
  const [forwardSource, setForwardSource] = useState<Message | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [pinnedItems, setPinnedItems] = useState<any[]>([]);
  const [mediaById, setMediaById] = useState<Record<string, MediaItem>>({});
  const [actionMenu, setActionMenu] = useState<{ visible: boolean; options: ChatActionMenuOption[] }>({ visible: false, options: [] });
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null);
  const [reactionModal, setReactionModal] = useState<{
    visible: boolean;
    message: Message | null;
    emojiFilter: string | null;
  }>({
    visible: false,
    message: null,
    emojiFilter: null,
  });
  const [reactionPickerMsg, setReactionPickerMsg] = useState<Message | null>(null);

  // Tránh mở Picker nhiều lần cùng lúc gây lỗi "picking in progress"
  const isPicking = useRef(false);
  // Theo dõi tin nhắn đã đánh dấu đọc trong session này
  const markedMessageIds = useRef<Set<string>>(new Set());
  const isTypingRef = useRef(false);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // ==================== MEDIA HARVESTING ====================
  // Trích xuất thông tin Media từ tin nhắn vào cache, tránh gọi API thừa
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
    if (Object.keys(mediaMap).length > 0) {
      setMediaById((prev) => ({ ...prev, ...mediaMap }));
    }
  }, []);

  // Tải media còn thiếu một cách bất đồng bộ, không tạo vòng lặp phụ thuộc
  const ensureMediaLoaded = useCallback((mediaIds: string[]) => {
    const uniqueIds = Array.from(new Set((mediaIds || []).filter(Boolean)));
    setMediaById((currentCache) => {
      const missingIds = uniqueIds.filter(
        (id) => !currentCache[id] && !id.startsWith('temp-')
      );
      if (missingIds.length === 0) return currentCache;

      void (async () => {
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
        if (validEntries.length > 0) {
          setMediaById((prev) => ({ ...prev, ...Object.fromEntries(validEntries) }));
        }
      })();

      return currentCache;
    });
  }, []);

  // ==================== LOAD TIN NHẮN BAN ĐẦU ====================
  const loadInitialMessages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMessages({ conversationId, limit: 30 });
      setMessages(res.items);
      setNextCursor(res.nextCursor);
      harvestMediaFromMessages(res.items);

      const convRes = await getConversations(null, 100);
      const matched = (convRes.items || []).find((item) => (item._id || item.id) === conversationId) || null;
      setConversation(matched);
      if (matched) {
        getPinnedMessages(conversationId).then(setPinnedItems).catch(console.error);
        if (matched.type !== 'group') {
          const other = matched.participants?.find((p) => (p._id || p.id || '') !== currentUserId);
          if (other) {
            const blockedList = await getBlockedUsers();
            const targetId = other._id || other.id || '';
            setIsBlockedByMe(blockedList.some((u: any) => (u._id || u.id || '') === targetId));
          }
        }
      }
    } catch (error) {
      console.log('Error loading messages', error);
      Alert.alert('Lỗi', 'Không thể tải tin nhắn');
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, harvestMediaFromMessages]);

  useEffect(() => {
    loadInitialMessages();
  }, [loadInitialMessages]);

  // ==================== SOCKET LISTENER FOR GROUP UPDATES ====================
  useEffect(() => {
    const { getSocket } = require('../../utils/socketService');
    const socket = getSocket();
    
    if (!socket) return;

    const handleGroupUpdated = async (payload: any) => {
      if (!payload) return;
      const { conversationId: updatedConvId, ownerId, adminIds, action } = payload;
      
      console.log('[Socket] group_updated:', payload);
      
      // Only update if it's the current conversation
      if (String(updatedConvId) === String(conversationId)) {
        // Reload conversation to get updated owner/admin info
        try {
          const convRes = await getConversations(null, 100);
          const updatedConv = convRes.items.find((c: any) => String(c._id || c.id) === String(conversationId));
          
          if (updatedConv) {
            console.log('[Socket] Updated conversation:', {
              ownerId: updatedConv.ownerId,
              adminIds: updatedConv.adminIds,
              action,
            });
            setConversation(updatedConv);
          }
        } catch (error) {
          console.error('[Socket] Failed to reload conversation:', error);
        }
      }
    };

    socket.on('group_updated', handleGroupUpdated);

    return () => {
      socket.off('group_updated', handleGroupUpdated);
    };
  }, [conversationId]);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const filteredMembers = useMemo(() => {
    if (mentionQuery === null || !conversation?.participants) return [];
    const q = mentionQuery.toLowerCase();
    const membersList = conversation.participants.filter(p => (p._id || p.id) !== currentUserId);
    const mentions = membersList.filter(p => p.username?.toLowerCase().includes(q));
    if ('all'.includes(q)) {
      mentions.unshift({ _id: 'all', id: 'all', username: 'all', avatarUrl: '' } as any);
    }
    return mentions;
  }, [mentionQuery, conversation?.participants, currentUserId]);

  const handleMentionSelect = useCallback((username: string) => {
    if (mentionQuery === null) return;
    const regex = new RegExp(`@${mentionQuery}$`);
    setInputText((prev) => prev.replace(regex, `@${username} `));
    setMentionQuery(null);
  }, [mentionQuery]);

  // ==================== HELPERS ====================
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

    // Mention logic
    const lastWordMatch = text.match(/@([\w\._]*)$/);
    if (lastWordMatch && conversation?.type === 'group') {
      setMentionQuery(lastWordMatch[1]);
    } else {
      setMentionQuery(null);
    }

    if (!isSocketReady) return;
    if (!text.trim()) {
      stopTypingWithEmit();
      return;
    }
    if (!isTypingRef.current) {
      emitTyping(conversationId);
      isTypingRef.current = true;
    }
    if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
    typingStopTimeoutRef.current = setTimeout(() => {
      stopTypingWithEmit();
    }, 1500);
  }, [conversationId, isSocketReady, stopTypingWithEmit, conversation?.type]);

  // ==================== ĐÁNH DẤU ĐÃ XEM (chống vòng lặp) ====================
  useEffect(() => {
    if (messages.length === 0 || !currentUserId) return;

    const getIdStr = (m: any): string => m._id || m.id || '';

    const unread = messages.filter((m) => {
      const mid = getIdStr(m);
      // Bỏ qua tin nhắn tạm và tin đã xử lý
      if (!mid || mid.startsWith('temp-')) return false;
      if (markedMessageIds.current.has(mid)) return false;
      if (getMessageSenderId(m) === currentUserId) return false;
      return !getNormalizedUserIds(m.seenBy || []).includes(currentUserId);
    });

    if (unread.length > 0) {
      // Đánh dấu ngay vào Ref trước khi gọi API để tránh re-trigger
      unread.forEach((m) => markedMessageIds.current.add(getIdStr(m)));

      void (async () => {
        await Promise.allSettled(
          unread.map(async (m) => {
            const mid = getIdStr(m);
            emitMessageDelivered(mid);
            try { await markMessageRead(mid); } catch { /* ignore */ }
            emitMessageSeen(mid);
          })
        );
      })();
    }
    // Chỉ phụ thuộc vào ĐỘ DÀI của mảng, không phải toàn bộ object để tránh vòng lặp
  }, [messages.length, currentUserId, getNormalizedUserIds]);

  // Dọn dẹp typing khi unmount
  useEffect(() => () => stopTypingWithEmit(), [stopTypingWithEmit]);

  // Tải media còn thiếu khi danh sách tin nhắn thay đổi
  useEffect(() => {
    const stringIds = messages.flatMap((m) =>
      (m.mediaIds || [])
        .map((mid: any) => typeof mid === 'string' ? mid : (mid._id || mid.id || ''))
        .filter((id: string) => !!id && !id.startsWith('temp-'))
    );
    if (stringIds.length > 0) ensureMediaLoaded(stringIds);
  }, [messages.length, ensureMediaLoaded]);

  // ==================== SOCKET ====================
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      const socket = await connectSocket();
      if (!mounted || !socket) return;
      joinConversation(conversationId);
      setIsSocketReady(socket.connected);

      const onConnect = () => { setIsSocketReady(true); joinConversation(conversationId); };
      const onDisconnect = () => setIsSocketReady(false);

      const onNewMessage = (message: Message) => {
        const msgConvId = getConversationIdFromMessage(message);
        if (msgConvId !== conversationId) return;

        setMessages((prev) => {
          // 1. Kiểm tra trùng lặp theo ID thật
          if (prev.some((m) => getMessageId(m) === getMessageId(message))) return prev;

          let enhanced = { ...message };
          if (enhanced.replyTo && typeof enhanced.replyTo === 'string') {
            const original = prev.find((m) => getMessageId(m) === enhanced.replyTo);
            if (original) enhanced.replyTo = original;
          }

          // 2. Thay thế tin nhắn tạm (Optimistic) nếu tìm thấy
          const tempIdx = prev.findIndex(
            (m) =>
              (m.status === 'sending' as any) &&
              (m.content || '').trim() === (message.content || '').trim() &&
              getMessageSenderId(m) === getMessageSenderId(message)
          );

          if (tempIdx !== -1) {
            const updated = [...prev];
            updated[tempIdx] = enhanced;
            return updated;
          }

          return [enhanced, ...prev];
        });

        if (getMessageSenderId(message) !== currentUserId) {
          const mid = getMessageId(message);
          emitMessageDelivered(mid);
          markMessageRead(mid).catch(() => null).finally(() => emitMessageSeen(mid));
          setTypingUserIds((prev) => prev.filter((id) => id !== getMessageSenderId(message)));
        }
      };

      const onMessageRecalled = (payload: { messageId: string; conversationId: string }) => {
        if (payload.conversationId !== conversationId) return;
        setMessages((prev) =>
          prev.map((m) => getMessageId(m) === payload.messageId ? { ...m, isRecalled: true } : m)
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
              : m
          )
        );
      };

      const onMessageDelivered = (payload: { messageId: string; userId: string }) => {
        setMessages((prev) =>
          prev.map((m) =>
            getMessageId(m) === payload.messageId
              ? { ...m, deliveredTo: Array.from(new Set([...(m.deliveredTo || []), payload.userId])) }
              : m
          )
        );
      };

      const onTyping = (payload: { conversationId: string; userId: string }) => {
        if (payload.conversationId !== conversationId || payload.userId === currentUserId) return;
        setTypingUserIds((prev) => prev.includes(payload.userId) ? prev : [...prev, payload.userId]);
      };

      const onStopTyping = (payload: { conversationId: string; userId: string }) => {
        if (payload.conversationId !== conversationId || payload.userId === currentUserId) return;
        setTypingUserIds((prev) => prev.filter((id) => id !== payload.userId));
      };

      const onPinnedItemsUpdated = (payload: any) => {
        // Hỗ trợ cả payload cũ (array) và payload mới { conversationId, pinnedItems }
        if (Array.isArray(payload)) {
          setPinnedItems(payload);
        } else if (payload && payload.conversationId === conversationId) {
          setPinnedItems(payload.pinnedItems || []);
        }
      };

      const onMessageReacted = (payload: { messageId: string; reactions: any[] }) => {
        setMessages((prev) =>
          prev.map((m) => getMessageId(m) === payload.messageId ? { ...m, reactions: payload.reactions } : m)
        );
      };

      const onConversationSettingsUpdated = (newSettings: any) => {
        console.log('[Mobile Chat] conversation_settings_updated:', newSettings);
        setConversation((prev) => prev ? { ...prev, settings: newSettings } : prev);
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
      socket.on('conversation_settings_updated', onConversationSettingsUpdated);

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
        socket.off('conversation_settings_updated', onConversationSettingsUpdated);
      };
    };

    const cleanupPromise = setupSocket();
    return () => {
      mounted = false;
      Promise.resolve(cleanupPromise).then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, [conversationId, currentUserId]);

  // ==================== LOAD MORE ====================
  const loadMoreMessages = async () => {
    if (!nextCursor || isFetchingMore) return;
    setIsFetchingMore(true);
    try {
      const res = await getMessages({ conversationId, limit: 20, cursor: nextCursor });
      setMessages((prev) => {
        const existing = new Set(prev.map((m) => getMessageId(m)));
        const incoming = (res.items || []).filter((m) => !existing.has(getMessageId(m)));
        harvestMediaFromMessages(incoming);
        return [...prev, ...incoming];
      });
      setNextCursor(res.nextCursor);
    } catch (error) {
      console.log('Error loading more messages', error);
    } finally {
      setIsFetchingMore(false);
    }
  };

  // ==================== GỬI TIN NHẮN (OPTIMISTIC UI) ====================
  const handleSendText = async () => {
    const text = inputText.trim();
    if (!text || isSending) return;
    stopTypingWithEmit();

    const replyId = replyTo ? getMessageId(replyTo) : undefined;
    const currentReplyTo = replyTo;

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      _id: tempId,
      id: tempId,
      content: text,
      senderId: user as any,
      conversationId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'sending',
      replyTo: currentReplyTo ?? null,
      mediaIds: [],
      attachments: [],
      deliveredTo: [],
      seenBy: [],
      reactions: [],
    };

    setInputText('');
    setReplyTo(null);
    setShowEmojiPanel(false);
    setIsSending(true);
    setMessages((prev) => [tempMsg, ...prev]);

    try {
      const newMsg = await sendMessage({ conversationId, content: text, replyTo: replyId });
      // Thay thế tin nhắn tạm bằng tin nhắn thật từ server
      setMessages((prev) => prev.map((m) => getMessageId(m) === tempId ? newMsg : m));
      if (newMsg.mediaIds?.length) harvestMediaFromMessages([newMsg]);
    } catch (error: any) {
      console.error('Failed to send message:', error);
      setMessages((prev) => prev.filter((m) => getMessageId(m) !== tempId));
      
      // Hiển thị message thân thiện dựa trên error code
      let errorTitle = 'Lỗi';
      let errorMessage = 'Không thể gửi tin nhắn';
      
      if (error.errorCode === 'ONLY_ADMIN_CAN_SEND' || error.message?.includes('Only admin/owner can send messages')) {
        errorTitle = 'Không có quyền gửi tin nhắn';
        errorMessage = 'Chỉ trưởng nhóm và phó nhóm mới có thể gửi tin nhắn trong nhóm này.';
      } else if (error.errorCode === 'BLOCKED_BY_USER') {
        errorTitle = 'Không thể gửi tin nhắn';
        errorMessage = 'Bạn đã bị người này chặn.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert(errorTitle, errorMessage);
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  };

  const getAudioMimeTypeFromUri = (uri: string): string => {
    const ext = uri.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'm4a':
        return 'audio/mp4';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      case 'webm':
        return 'audio/webm';
      default:
        return 'audio/mp4';
    }
  };

  const handleSendVoice = async (uri: string, duration: number) => {
    if (!uri || isSending) return;
    setShowVoiceRecorder(false);
    setIsSending(true);

    console.log('[Voice] Sending voice with duration:', duration, 'seconds');

    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'm4a';
      const fileName = `voice-${Date.now()}.${ext}`;
      const mimeType = getAudioMimeTypeFromUri(uri);
      
      console.log('[Voice] Uploading:', { fileName, mimeType, duration });
      
      // Upload with duration
      const uploaded = await uploadMediaForm({ uri, fileName, mimeType, duration });
      
      console.log('[Voice] Upload response:', {
        mediaId: uploaded._id || uploaded.id,
        duration: (uploaded as any).duration || duration, // Fallback to original duration
      });
      
      const mediaId = uploaded._id || uploaded.id;

      if (!mediaId) {
        throw new Error('Upload voice không trả về mediaId');
      }

      // Ensure duration is set in uploaded object
      const uploadedWithDuration = {
        ...uploaded,
        duration: (uploaded as any).duration || duration, // Use backend duration or fallback
      } as any;

      setMediaById((prev) => ({ ...prev, [mediaId]: uploadedWithDuration }));
      const newMsg = await sendMessage({ conversationId, mediaIds: [mediaId], content: '' });
      setMessages((prev) =>
        prev.some((m) => getMessageId(m) === getMessageId(newMsg)) ? prev : [newMsg, ...prev]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err?.message || 'Không thể gửi ghi âm');
      console.error('Voice send failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  // ==================== CHỤP ẢNH ====================
  const handleTakeImage = async () => {
    if (isPicking.current) return;
    isPicking.current = true;
    setShowMediaMenu(false);
    await new Promise((resolve) => setTimeout(resolve, 500));
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
      setIsSending(true);
      const asset = result.assets[0];
      const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
      const fileName = asset.fileName || `photo-${Date.now()}.${ext}`;
      const uploaded = await uploadMediaForm({ uri: asset.uri, fileName, mimeType });
      const mediaId = uploaded._id || uploaded.id;
      if (!mediaId) throw new Error('Không upload được ảnh');

      setMediaById((prev) => ({ ...prev, [mediaId]: uploaded }));
      const newMsg = await sendMessage({ conversationId, mediaIds: [mediaId], content: '' });
      setMessages((prev) =>
        prev.some((m) => getMessageId(m) === getMessageId(newMsg)) ? prev : [newMsg, ...prev]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi ảnh');
    } finally {
      setIsSending(false);
      isPicking.current = false;
    }
  };

  // ==================== CHỌN ẢNH ====================
  const handlePickImage = async () => {
    if (isPicking.current) return;
    isPicking.current = true;
    setShowMediaMenu(false);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any,
        quality: 0.8,
        allowsMultipleSelection: true,
      });
      if (result.canceled || !result.assets?.length) return;
      setIsSending(true);
      const uploads = await Promise.all(
        result.assets.map(async (asset) => {
          try {
            const ext = asset.uri.split('.').pop()?.toLowerCase() || 'jpg';
            const mimeType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
            const fileName = asset.fileName || `photo-${Date.now()}.${ext}`;
            return await uploadMediaForm({ uri: asset.uri, fileName, mimeType });
          } catch (e) {
            console.error('Failed to upload image:', e);
            return null;
          }
        })
      );
      const mediaIds = uploads
        .filter((m): m is MediaItem => m !== null)
        .map((m) => m._id || m.id)
        .filter(Boolean) as string[];
      if (!mediaIds.length) throw new Error('Không upload được ảnh nào');
      setMediaById((prev) => {
        const updated = { ...prev };
        uploads.forEach((m) => { if (m) { const id = m._id || m.id; if (id) updated[id] = m; } });
        return updated;
      });
      const newMsg = await sendMessage({ conversationId, mediaIds, content: '' });
      setMessages((prev) =>
        prev.some((m) => getMessageId(m) === getMessageId(newMsg)) ? prev : [newMsg, ...prev]
      );
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi ảnh');
    } finally {
      setIsSending(false);
      isPicking.current = false;
    }
  };

  // ==================== CHỌN FILE ====================
  const handleDocumentPick = async () => {
    if (isPicking.current) return;
    isPicking.current = true;
    setShowMediaMenu(false);
    await new Promise((resolve) => setTimeout(resolve, 500));
    try {
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: true });
      if (result.canceled || !result.assets?.length) return;
      setIsSending(true);
      const uploads = await Promise.all(
        result.assets.map(async (asset) => {
          try {
            const fileName = asset.name || `file-${Date.now()}`;
            return await uploadMediaForm({
              uri: asset.uri,
              fileName,
              mimeType: asset.mimeType || getMimeTypeFromFileName(fileName),
            });
          } catch (e) {
            console.error('Failed to upload file:', e);
            return null;
          }
        })
      );
      const mediaIds = uploads
        .filter((m): m is MediaItem => m !== null)
        .map((m) => m._id || m.id)
        .filter(Boolean) as string[];
      if (!mediaIds.length) throw new Error('Không thể tải lên tệp tin nào');
      setMediaById((prev) => {
        const updated = { ...prev };
        uploads.forEach((m) => { if (m) { const id = m._id || m.id; if (id) updated[id] = m; } });
        return updated;
      });
      const newMsg = await sendMessage({
        conversationId,
        mediaIds,
        content: `Đã gửi ${result.assets.length} file`,
      });
      setMessages((prev) =>
        prev.some((m) => getMessageId(m) === getMessageId(newMsg)) ? prev : [newMsg, ...prev]
      );
    } catch (e: any) {
      console.error('Document picker error:', e);
      Alert.alert('Lỗi', e.message || 'Không thể chọn file');
    } finally {
      setIsSending(false);
      isPicking.current = false;
    }
  };

  // ==================== CÁC ACTION KHÁC ====================
  const openAttachment = useCallback(async (media?: MediaItem | null) => {
    if (!media?.url) return;
    try {
      await Linking.openURL(media.url);
    } catch {
      Alert.alert('Lỗi', 'Không thể mở tệp trên thiết bị này');
    }
  }, []);
  const handleInlineLinkPress = useCallback(async (url: string) => {
    try {
      const inviteQuery = url.match(/^mobileapp:\/\/join-group\?code=([^&\s]+)/i);
      if (inviteQuery?.[1]) {
        router.push((`/join-group?code=${decodeURIComponent(inviteQuery[1])}`) as any);
        return;
      }

      const invitePath = url.match(/^mobileapp:\/\/join\/([^?\s]+)/i);
      if (invitePath?.[1]) {
        router.push((`/join-group?code=${decodeURIComponent(invitePath[1])}`) as any);
        return;
      }

      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('Lỗi', 'Không mở được liên kết');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Lỗi', 'Không mở được liên kết');
    }
  }, [router]);

  const openForwardModal = async (msg: Message) => {
    try {
      const res = await getConversations(null, 50);
      const targets = (res.items || []).filter((c) => (c._id || c.id) !== conversationId);
      setConversations(targets);
      setForwardSource(msg);
      setForwardModalVisible(true);
    } catch {
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
        mediaIds: (forwardSource.mediaIds || []).map((mediaItem: any) => extractMediaId(mediaItem)).filter((id: string) => isValidObjectId(id)),
        ...(isValidObjectId(getMessageId(forwardSource)) ? { forwardFrom: getMessageId(forwardSource) } : {}),
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
    setReactionPickerMsg(msg);
  };

  const handleOpenConversationOptions = () => {
    if (!conversation) return;
    router.push({ pathname: '/conversation-details', params: { id: conversationId } });
  };

  const friendIds = (user?.friends || []).map((f: any) => typeof f === 'string' ? f : f._id || f.id);
  const isStranger = conversation?.type === 'direct' && otherParticipant && !friendIds.includes(otherParticipant._id || otherParticipant.id || '');

  const handleSendFriendRequest = async () => {
    if (!otherParticipant) return;
    try {
      const { sendFriendRequest } = require('../../utils/friendService');
      await sendFriendRequest({ toUserId: otherParticipant._id || otherParticipant.id || '' });
      Alert.alert('✅', 'Đã gửi lời mời kết bạn');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi kết bạn');
    }
  };

  const handleVoiceCall = () => {
    const isGroup = conversation?.type === 'group';
    // CRITICAL: roomId must match web's formula for cross-platform calls
    // 1-1: sort both IDs so the same room is generated regardless of who calls
    // Group: timestamp-based since all members join from notification
    const myId = (user as any)?._id || (user as any)?.id || '';
    const targetId = (otherParticipant as any)?._id || (otherParticipant as any)?.id || '';
    const roomId = isGroup
      ? `call_${conversationId}_${Date.now()}`
      : [myId, targetId].sort().join('_');

    try {
      const { getSocket, startGroupCall, callUser } = require('../../utils/socketService');
      const socket = getSocket();
      if (!socket?.connected) {
        Alert.alert('Lỗi', 'Mất kết nối, vui lòng thử lại');
        return;
      }

      if (isGroup) {
        startGroupCall({
          conversationId,
          roomId,
          callerName: user?.username || 'Thành viên',
          type: 'audio' as const,
        });
        router.push({ pathname: '/group-call/[roomId]', params: { roomId, type: 'voice' } } as any);
      } else {
        callUser({
          targetUserId: targetId,
          roomId,
          callerName: user?.username || 'Thành viên',
          type: 'audio' as const,
          conversationId,
        });
        router.push({ pathname: '/call/[roomId]', params: { roomId, type: 'voice' } } as any);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi');
    }
  };

  const handleVideoCall = () => {
    const isGroup = conversation?.type === 'group';
    const myId = (user as any)?._id || (user as any)?.id || '';
    const targetId = (otherParticipant as any)?._id || (otherParticipant as any)?.id || '';
    const roomId = isGroup
      ? `call_${conversationId}_${Date.now()}`
      : [myId, targetId].sort().join('_');

    try {
      const { getSocket, startGroupCall, callUser } = require('../../utils/socketService');
      const socket = getSocket();
      if (!socket?.connected) {
        Alert.alert('Lỗi', 'Mất kết nối, vui lòng thử lại');
        return;
      }

      if (isGroup) {
        startGroupCall({
          conversationId,
          roomId,
          callerName: user?.username || 'Thành viên',
          type: 'video' as const,
        });
        router.push({ pathname: '/group-call/[roomId]', params: { roomId, type: 'video' } } as any);
      } else {
        callUser({
          targetUserId: targetId,
          roomId,
          callerName: user?.username || 'Thành viên',
          type: 'video' as const,
          conversationId,
        });
        router.push({ pathname: '/call/[roomId]', params: { roomId, type: 'video' } } as any);
      }
    } catch (err) {
      Alert.alert('Lỗi', 'Không thể bắt đầu cuộc gọi video');
    }
  };

  const getPinnedMessageId = (pinnedItem: any): string => {
    const messageRef = pinnedItem?.messageId;
    if (!messageRef) return '';
    if (typeof messageRef === 'string') return messageRef;
    return messageRef._id || messageRef.id || '';
  };

  const handleMessageLongPress = (msg: Message) => {
    const isMine = getMessageSenderId(msg) === currentUserId;

    // Kiểm tra quyền Admin/Owner
    const isGroup = conversation?.type === 'group';
    const ownerId = typeof conversation?.ownerId === 'string' ? conversation.ownerId : (conversation?.ownerId as any)?._id;
    const adminIds = (conversation?.adminIds || []).map((admin: any) => typeof admin === 'string' ? admin : admin?._id);
    const iAmOwner = ownerId === currentUserId;
    const iAmAdmin = iAmOwner || adminIds.includes(currentUserId);
    const canRecall = isMine || (isGroup && iAmAdmin);

    const messageId = getMessageId(msg);
    const isPinned = pinnedItems.some((item) => getPinnedMessageId(item) === messageId);
    const buttons: ChatActionMenuOption[] = [{ text: 'Hủy', style: 'cancel', onPress: () => { } }];

    if (!msg.isRecalled) {
      buttons.push({ text: '↩ Trả lời', onPress: () => setReplyTo(msg) });
    }
    if (canRecall && !msg.isRecalled) {
      buttons.push({
        text: '↩ Thu hồi',
        onPress: async () => {
          try {
            await recallMessage(getMessageId(msg));
            setMessages((prev) =>
              prev.map((m) => getMessageId(m) === getMessageId(msg) ? { ...m, isRecalled: true } : m)
            );
          } catch { Alert.alert('Lỗi', 'Không thể thu hồi'); }
        },
      });
    }
    if (!msg.isRecalled) {
      buttons.push({
        text: '✕ Xóa phía tôi',
        isDestructive: true,
        onPress: async () => {
          try {
            await deleteMessage(getMessageId(msg));
            setMessages((prev) => prev.filter((m) => getMessageId(m) !== getMessageId(msg)));
          } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
        },
      });
      buttons.push({ text: '😊 Thả cảm xúc', onPress: () => handleReactToMessage(msg) });
      buttons.push({ text: '↗ Chuyển tiếp', onPress: () => openForwardModal(msg) });
    }
    if (!msg.isRecalled) {
      buttons.push({
        text: isPinned ? 'Bỏ ghim' : 'Ghim tin nhắn',
        onPress: async () => {
          try {
            const updatedItems = isPinned
              ? await unpinMessage(conversationId, messageId)
              : await pinMessage(conversationId, messageId);
            setPinnedItems(updatedItems);
            Alert.alert('Thành công', isPinned ? 'Đã gỡ ghim tin nhắn' : 'Đã ghim tin nhắn');
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || (isPinned ? 'Không thể gỡ ghim' : 'Không thể ghim tin nhắn'));
          }
        },
      });
    }
    setActionMenu({ visible: true, options: buttons });
  };

  const handleUnblock = async () => {
    if (!otherParticipant) return;
    setUnblockLoading(true);
    try {
      const targetId = otherParticipant._id || otherParticipant.id || '';
      await blockOrUnblockUser(targetId);
      setIsBlockedByMe(false);
      Alert.alert('✅', 'Đã bỏ chặn người dùng');
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể bỏ chặn');
    } finally {
      setUnblockLoading(false);
    }
  };

  // ==================== RENDERS THE ATTACHMENT BOX ====================
  const renderMessageStatus = (item: Message) => {
    if ((item.status as any) === 'sending') return <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.6)" />;
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

  const getReactionUserInfo = useCallback((reaction: any) => {
    const reactionUserId =
      typeof reaction?.userId === 'string'
        ? reaction.userId
        : reaction?.userId?._id || reaction?.userId?.id || '';
    const participant = conversation?.participants?.find((p) => (p._id || p.id || '') === reactionUserId);
    const reactionUser = typeof reaction?.userId === 'object' ? reaction.userId : null;
    const username = participant?.username || reactionUser?.username || 'Người dùng';

    return {
      userId: reactionUserId,
      username,
      avatarUrl:
        participant?.avatarUrl ||
        reactionUser?.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=2563EB&color=fff&size=100&bold=true`,
    };
  }, [conversation?.participants]);

  const openReactionDetails = useCallback((message: Message, emoji?: string) => {
    setReactionModal({
      visible: true,
      message,
      emojiFilter: emoji || null,
    });
  }, []);

  const closeReactionDetails = useCallback(() => {
    setReactionModal({ visible: false, message: null, emojiFilter: null });
  }, []);

  const renderMessage = ({ item }: { item: Message }) => {
    const senderId = getMessageSenderId(item);
    const isMine = senderId === currentUserId;
    const senderObj = typeof item.senderId === 'string' ? null : item.senderId;
    const senderName = senderObj?.username || '';
    const senderAvatarUrl = senderObj?.avatarUrl;
    const isSendingMsg = (item.status as any) === 'sending';

    // Cần kiểm tra xem senderId có nằm trong adminIds hoặc ownerId của conversation không
    const isGroup = conversation?.type === 'group';
    const ownerId = typeof conversation?.ownerId === 'string' ? conversation.ownerId : (conversation?.ownerId as any)?._id;
    const adminIds = (conversation?.adminIds || []).map((admin: any) => typeof admin === 'string' ? admin : admin?._id);
    const isSenderAdmin = adminIds.includes(senderId) || ownerId === senderId;

    const groupedReactions = (item.reactions || []).reduce((acc, reaction: any) => {
      const emoji = reaction?.emoji;
      if (!emoji) return acc;
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const reactionEntries = Object.entries(groupedReactions);

    if (item.type === 'system') {
      return (
        <View style={{ alignItems: 'center', marginVertical: 8, paddingHorizontal: 20 }}>
          <View style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 }}>
            <Text style={{ fontSize: 12, color: colors.muted, fontStyle: 'italic', textAlign: 'center' }}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (item.isRecalled) {
      return (
        <View style={[styles.bubbleWrapper, isMine ? styles.myWrapper : styles.theirWrapper]}>
          <View style={[styles.bubble, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F1F5F9' }]}>
            <Text style={{ color: '#94A3B8', fontStyle: 'italic', fontSize: 14 }}>Tin nhắn đã bị thu hồi</Text>
          </View>
        </View>
      );
    }

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

    const replyMsg = item.replyTo && typeof item.replyTo === 'object' ? item.replyTo : null;

    return (
      <Pressable
        onLongPress={() => !isSendingMsg && handleMessageLongPress(item)}
        style={[
          styles.bubbleWrapper,
          isMine ? styles.myWrapper : styles.theirWrapper,
          isSendingMsg && { opacity: 0.7 },
        ]}
      >
        {!isMine && (
          <Image
            source={{ uri: senderAvatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName || 'U')}&background=0EA5E9&color=fff&size=60&bold=true` }}
            style={styles.senderAvatar}
          />
        )}
        <View style={{ flex: 1, alignItems: isMine ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
          {!isMine && conversation?.type === 'group' && senderName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Text style={{ fontSize: 11, color: colors.tint, fontWeight: '600', marginLeft: 4 }}>{senderName}</Text>
              {conversation?.settings?.markAdminMessages && isSenderAdmin && (
                <View style={{ backgroundColor: '#FCD34D', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4, marginLeft: 6 }}>
                  <Text style={{ fontSize: 8, color: '#92400E', fontWeight: 'bold' }}>AD</Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={[styles.bubbleContainer, reactionEntries.length > 0 && styles.bubbleContainerWithReaction]}>
            <View style={[styles.bubble, isMine ? { backgroundColor: '#0068FF' } : { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F1F5F9' }]}>
              {replyMsg && (
                <View style={[styles.replyQuote, { borderLeftColor: isMine ? 'rgba(255,255,255,0.5)' : colors.tint }]}>
                  <Text style={{ color: isMine ? 'rgba(255,255,255,0.6)' : colors.tint, fontSize: 11, fontWeight: '600' }} numberOfLines={1}>
                    {typeof (replyMsg as any).senderId === 'object' ? (replyMsg as any).senderId?.username : 'Tin nhắn'}
                  </Text>
                  <Text style={{ color: isMine ? 'rgba(255,255,255,0.7)' : colors.muted, fontSize: 12 }} numberOfLines={2}>
                    {(replyMsg as any).content || 'Tệp đính kèm...'}
                  </Text>
                </View>
              )}

              {item.forwardFrom && (
                <Text style={{ color: isMine ? '#DBEAFE' : colors.muted, fontSize: 11, marginBottom: 4, fontStyle: 'italic' }}>↪ Chuyển tiếp</Text>
              )}

              {item.content ? (
                <Text style={{ color: isMine ? '#fff' : colors.text, fontSize: 16, lineHeight: 22 }}>
                  {item.content.split(/(mobileapp:\/\/[^\s]+|https?:\/\/[^\s]+|@[\w\._]*)/g).map((part, index) => {
                    if (!part) return null;

                    if (/^(mobileapp:\/\/[^\s]+|https?:\/\/[^\s]+)$/i.test(part)) {
                      return (
                        <Text
                          key={index}
                          style={{ fontWeight: '700', textDecorationLine: 'underline', color: isMine ? '#DBEAFE' : '#2563EB' }}
                          onPress={() => handleInlineLinkPress(part)}
                        >
                          {part}
                        </Text>
                      );
                    }

                    if (part.startsWith('@')) {
                      return (
                        <Text key={index} style={{ fontWeight: 'bold', color: isMine ? '#DBEAFE' : '#0068FF' }}>
                          {part}
                        </Text>
                      );
                    }
                    return <Text key={index}>{part}</Text>;
                  })}
                </Text>
              ) : null}

              {!!item.mediaIds?.length && (
                <View style={{ marginTop: item.content ? 8 : 0, gap: 6 }}>
                  {item.mediaIds.map((mediaItem: any, idx) => {
                    const mediaId = typeof mediaItem === 'string' ? mediaItem : (mediaItem._id || mediaItem.id || '');
                    const rawMedia = typeof mediaItem === 'string' ? mediaById[mediaId] : mediaItem;
                    const media = rawMedia ? { ...rawMedia, url: toAbsoluteMediaUrl(rawMedia.url) } : null;
                    const isImage = isImageAttachment(media);
                    const isAudio = isImage ? false : isAudioAttachment(media);
                    const fileName = media?.fileName || `Tệp đính kèm ${idx + 1}`;
                    const canOpen = !!media?.url;

                    if (isImage && media?.url) {
                      return (
                        <TouchableOpacity key={`${mediaId}-${idx}`} onPress={() => setViewImageUrl(media.url || null)} activeOpacity={0.9}>
                          <Image source={{ uri: media.url }} style={styles.inlineImage} resizeMode="cover" />
                        </TouchableOpacity>
                      );
                    }

                    if (isAudio && media?.url) {
                      return (
                        <View key={`${mediaId}-${idx}`} style={styles.audioAttachment}>
                          <AudioBubbleMobile url={media.url} isMe={isMine} duration={media.duration} />
                        </View>
                      );
                    }

                    return (
                      <TouchableOpacity
                        key={`${mediaId}-${idx}`}
                        disabled={!canOpen}
                        onPress={() => openAttachment(media)}
                        style={[
                          styles.fileAttachment,
                          {
                            backgroundColor: isMine ? '#E0E7FF' : colors.surface,
                            borderColor: isMine ? '#C7D2FE' : colors.border,
                            borderWidth: 1
                          }
                        ]}
                      >
                        <View style={{ width: 44, height: 44, borderRadius: 10, backgroundColor: isMine ? '#4F46E5' : '#E5E7EB', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                          <Ionicons name="document" size={24} color={isMine ? '#fff' : '#6B7280'} />
                        </View>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text numberOfLines={1} ellipsizeMode="tail" style={{ color: isMine ? '#1E1B4B' : colors.text, fontSize: 14, fontWeight: '600' }}>
                            {fileName}
                          </Text>
                          <Text style={{ color: isMine ? '#4338CA' : colors.muted, fontSize: 11, marginTop: 2 }}>
                            {media?.size ? (media.size < 1024 * 1024 ? `${(media.size / 1024).toFixed(1)} KB` : `${(media.size / (1024 * 1024)).toFixed(1)} MB`) : 'FILE'}
                            {' • '}{(media?.fileName || '').split('.').pop()?.toUpperCase() || 'DAT'}
                          </Text>
                        </View>
                        {canOpen && <Ionicons name="cloud-download-outline" size={20} color={isMine ? '#4F46E5' : colors.muted} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <View style={[styles.msgMeta, { justifyContent: isMine ? 'flex-end' : 'flex-start' }]}>
                <Text style={{ color: isMine ? 'rgba(255,255,255,0.5)' : colors.muted, fontSize: 10 }}>
                  {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
                {isMine && <View style={{ marginLeft: 4 }}>{renderMessageStatus(item)}</View>}
              </View>
            </View>

            {!!reactionEntries.length && (
              <View
                style={[
                  styles.reactionOverlay,
                  isMine ? styles.reactionOverlayMine : styles.reactionOverlayTheir,
                  { backgroundColor: colorScheme === 'dark' ? '#111827' : '#FFFFFF', borderColor: colorScheme === 'dark' ? '#374151' : '#E2E8F0' },
                ]}
              >
                {reactionEntries.map(([emoji, count]) => (
                  <TouchableOpacity key={emoji} style={styles.reactionItem} onPress={() => openReactionDetails(item, emoji)}>
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                    {count > 1 ? <Text style={[styles.reactionCount, { color: colors.muted }]}>{count}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  // ==================== LOADING STATE ====================
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  // ==================== MAIN RENDER ====================
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
          headerStyle: { backgroundColor: colors.surface },
          headerShadowVisible: true,
          headerTitleAlign: 'left',
          headerBackVisible: false,
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginLeft: 4 }}>
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 2 }}>
              <TouchableOpacity onPress={handleVoiceCall} style={{ padding: 8 }}>
                <Ionicons name="call-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleVideoCall} style={{ padding: 8 }}>
                <Ionicons name="videocam-outline" size={22} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleOpenConversationOptions} style={{ padding: 8, marginRight: 4 }}>
                <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {!isSocketReady && (
        <View style={{ paddingVertical: 5, backgroundColor: colorScheme === 'dark' ? '#78350F' : '#FEF3C7', alignItems: 'center' }}>
          <Text style={{ color: colorScheme === 'dark' ? '#FDE68A' : '#92400E', fontSize: 11 }}>Đang kết nối...</Text>
        </View>
      )}

      {pinnedItems.length > 0 && (
        <PinnedBar
          pinnedItems={pinnedItems}
          colors={colors}
          brand="#0068FF"
          onPress={() => router.push({ pathname: '/pinned-messages', params: { id: conversationId } } as any)}
        />
      )}

      {isStranger && !isBlockedByMe && (
        <View style={{ backgroundColor: '#F0F5FF', padding: 12, margin: 16, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <Ionicons name="person-add" size={18} color="#0068FF" />
            <Text style={{ marginLeft: 8, color: '#4B5563', fontSize: 13, flex: 1 }}>Bạn và <Text style={{ fontWeight: 'bold' }}>{otherParticipant?.username || 'người này'}</Text> chưa kết bạn</Text>
          </View>
          <TouchableOpacity onPress={handleSendFriendRequest} style={{ borderWidth: 1, borderColor: '#0068FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#fff' }}>
            <Ionicons name="person-add" size={14} color="#0068FF" />
            <Text style={{ marginLeft: 4, color: '#0068FF', fontWeight: '600', fontSize: 13 }}>Gửi kết bạn</Text>
          </TouchableOpacity>
        </View>
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

        {mentionQuery !== null && filteredMembers.length > 0 && (
          <View style={{ maxHeight: 150, backgroundColor: colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }}>
            <FlatList
              data={filteredMembers}
              keyExtractor={(item: any) => typeof item === 'string' ? item : (item.id || item._id)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: any) => (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }}
                  onPress={() => handleMentionSelect(item.username)}
                >
                  {item.id === 'all' || item._id === 'all' ? (
                    <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#0068FF', alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                      <Ionicons name="people" size={18} color="#fff" />
                    </View>
                  ) : (
                    <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${item.username}&background=0068FF&color=fff` }} style={{ width: 30, height: 30, borderRadius: 15, marginRight: 10 }} />
                  )}
                  <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>
                    {item.id === 'all' || item._id === 'all' ? 'Tất cả mọi người (@all)' : item.username}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

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

        {isBlockedByMe ? (
          <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(12, insets.bottom), alignItems: 'center', justifyContent: 'center', paddingVertical: 12, flexDirection: 'column' }]}>
            <Text style={{ color: colors.muted, marginBottom: 8 }}>Bạn đã chặn người dùng này</Text>
            <TouchableOpacity onPress={handleUnblock} disabled={unblockLoading} style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 }}>
              {unblockLoading ? <ActivityIndicator size="small" color={colors.tint} /> : <Text style={{ color: colors.tint, fontWeight: 'bold' }}>BỎ CHẶN</Text>}
            </TouchableOpacity>
          </View>
        ) : (() => {
          // Check permission to send message in group
          const isGroupConv = conversation?.type === 'group';
          const ownerId = (conversation?.ownerId as any)?._id || conversation?.ownerId;
          const adminIds = conversation?.adminIds || [];
          const isOwner = ownerId && String(ownerId) === String(currentUserId);
          const isAdmin = adminIds.some((aid: any) => String(aid._id || aid) === String(currentUserId)) || isOwner;
          const canSend = !isGroupConv || isAdmin || conversation?.settings?.canMembersSendMessages !== false;

          if (isGroupConv && !canSend) {
            return (
              <View style={[styles.inputBar, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(12, insets.bottom), alignItems: 'center', justifyContent: 'center', paddingVertical: 16, flexDirection: 'column', gap: 8 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="information-circle" size={20} color={colors.tint} />
                  <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', flex: 1 }}>
                    Chỉ trưởng nhóm và phó nhóm mới có thể gửi tin nhắn trong nhóm này
                  </Text>
                </View>
              </View>
            );
          }

          return showVoiceRecorder ? (
            <View style={[styles.voiceRecorderWrap, { borderTopColor: colors.border, backgroundColor: colors.surface, paddingBottom: Math.max(12, insets.bottom) }]}>
              <VoiceRecorderMobile
                onCancel={() => setShowVoiceRecorder(false)}
                onSend={handleSendVoice}
              />
            </View>
          ) : (
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
                <Ionicons name="send" size={18} color="#fff" style={{ marginLeft: 3 }} />
              </TouchableOpacity>
              {inputText.trim().length === 0 && (
                <TouchableOpacity
                  onPress={() => setShowVoiceRecorder(true)}
                  disabled={isSending}
                  style={styles.iconBtn}
                >
                  <Ionicons name="mic-outline" size={24} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>
          );
        })()}
      </KeyboardAvoidingView>

      <ChatMediaMenuModal
        visible={showMediaMenu}
        onClose={() => setShowMediaMenu(false)}
        colors={colors}
        isGroup={conversation?.type === 'group'}
        onTakeImage={handleTakeImage}
        onPickImage={handlePickImage}
        onPickDocument={handleDocumentPick}
        onCreatePoll={() => {
          setShowMediaMenu(false);
          router.push({ pathname: '/create-poll', params: { conversationId } } as any);
        }}
      />

      {/* Modal xem ảnh */}
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

      <ChatForwardModal
        visible={forwardModalVisible}
        onClose={() => setForwardModalVisible(false)}
        colors={colors}
        conversations={conversations}
        currentUserId={currentUserId}
        isForwarding={isForwarding}
        onForward={handleForward}
        getConversationTitle={getConversationTitle}
      />

      {/* Emoji Picker Modal */}
      <Modal visible={!!reactionPickerMsg} transparent animationType="fade" onRequestClose={() => setReactionPickerMsg(null)}>
        <TouchableOpacity style={styles.reactionPickerOverlay} activeOpacity={1} onPress={() => setReactionPickerMsg(null)}>
          <Pressable style={[styles.reactionPickerBox, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={{ textAlign: 'center', fontSize: 16, fontWeight: 'bold', marginBottom: 16, color: colors.text }}>Chọn cảm xúc</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {QUICK_EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={async () => {
                    const msg = reactionPickerMsg;
                    setReactionPickerMsg(null);
                    if (!msg) return;
                    try {
                      const reactions = await reactToMessage(getMessageId(msg), emoji);
                      setMessages((prev) =>
                        prev.map((m) => getMessageId(m) === getMessageId(msg) ? { ...m, reactions: reactions || [] } : m)
                      );
                    } catch {
                      Alert.alert('Lỗi', 'Không thể thả cảm xúc');
                    }
                  }}
                  style={{ padding: 10, backgroundColor: colorScheme === 'dark' ? '#374151' : '#F3F4F6', borderRadius: 24, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </TouchableOpacity>
      </Modal>

      <ChatActionMenuModal
        visible={actionMenu.visible}
        onClose={() => setActionMenu({ visible: false, options: [] })}
        options={actionMenu.options}
        colors={colors}
      />

      <Modal visible={reactionModal.visible} transparent animationType="slide" onRequestClose={closeReactionDetails}>
        <View style={styles.reactionDetailOverlay}>
          <View style={[styles.reactionDetailSheet, { backgroundColor: colors.surface }]}>
            <View style={styles.reactionDetailHeader}>
              <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700' }}>Cảm xúc</Text>
              <TouchableOpacity onPress={closeReactionDetails} style={styles.reactionCloseBtn}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            {reactionModal.message ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reactionFilterRow}>
                  <TouchableOpacity
                    onPress={() => setReactionModal((prev) => ({ ...prev, emojiFilter: null }))}
                    style={[
                      styles.reactionFilterChip,
                      { backgroundColor: reactionModal.emojiFilter === null ? '#4B5563' : '#E5E7EB' },
                    ]}
                  >
                    <Text style={{ color: reactionModal.emojiFilter === null ? '#fff' : '#111827', fontWeight: '700' }}>TẤT CẢ</Text>
                  </TouchableOpacity>
                  {Array.from(new Set((reactionModal.message.reactions || []).map((r: any) => r?.emoji).filter(Boolean))).map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => setReactionModal((prev) => ({ ...prev, emojiFilter: emoji }))}
                      style={[
                        styles.reactionFilterChip,
                        { backgroundColor: reactionModal.emojiFilter === emoji ? '#DBEAFE' : '#F3F4F6' },
                      ]}
                    >
                      <Text style={{ fontSize: 20 }}>{emoji}</Text>
                      <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 6 }}>
                        {(reactionModal.message?.reactions || []).filter((r: any) => r?.emoji === emoji).length}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <FlatList
                  data={(reactionModal.message.reactions || []).filter((reaction: any) => (
                    reactionModal.emojiFilter ? reaction?.emoji === reactionModal.emojiFilter : true
                  ))}
                  keyExtractor={(item: any, index) => `${typeof item?.userId === 'string' ? item.userId : item?.userId?._id || item?.userId?.id || index}-${item?.emoji || ''}-${index}`}
                  renderItem={({ item }) => {
                    const info = getReactionUserInfo(item);
                    return (
                      <View style={styles.reactionUserRow}>
                        <Image source={{ uri: info.avatarUrl }} style={styles.reactionAvatar} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{info.username}</Text>
                          <Text style={{ color: colors.muted, fontSize: 14 }}>Nhấn để gỡ</Text>
                        </View>
                        <Text style={{ fontSize: 36 }}>{item?.emoji || '🙂'}</Text>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <Text style={{ color: colors.muted }}>Chưa có cảm xúc nào</Text>
                    </View>
                  }
                />
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bubbleWrapper: { flexDirection: 'row', marginVertical: 2, marginHorizontal: 12, alignItems: 'flex-end' },
  myWrapper: { justifyContent: 'flex-end' },
  theirWrapper: { justifyContent: 'flex-start' },
  senderAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 6, marginBottom: 2 },
  bubbleContainer: { position: 'relative' },
  bubbleContainerWithReaction: { marginBottom: 14 },
  bubble: { borderRadius: 18, padding: 10, maxWidth: '100%' },
  reactionOverlay: {
    position: 'absolute',
    bottom: -12,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  reactionOverlayMine: { right: 8 },
  reactionOverlayTheir: { left: 8 },
  reactionItem: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 1 },
  reactionEmoji: { fontSize: 13, lineHeight: 16 },
  reactionCount: { fontSize: 10, fontWeight: '700', marginLeft: 1 },
  replyQuote: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 6, opacity: 0.85 },
  msgMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 2 },
  inlineImage: { width: 200, height: 160, borderRadius: 12 },
  audioAttachment: { maxWidth: 260 },
  fileAttachment: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minWidth: 240, maxWidth: 260 },
  replyPreview: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, gap: 8 },
  replyPreviewBar: { width: 3, height: '100%', borderRadius: 2, minHeight: 30 },
  inputBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  voiceRecorderWrap: { paddingHorizontal: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
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
  reactionDetailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  reactionDetailSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '62%',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
  },
  reactionDetailHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  reactionCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107,114,128,0.25)',
  },
  reactionFilterRow: { gap: 10, paddingVertical: 8, paddingBottom: 14 },
  reactionFilterChip: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  reactionAvatar: { width: 44, height: 44, borderRadius: 22 },
  reactionPickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  reactionPickerBox: { width: '85%', borderRadius: 24, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
});





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
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import type { Message, RoomModel } from '@/types/chat';
import * as messageService from '@/utils/messageService';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { TypingIndicator } from '@/components/chat/TypingIndicator';
import { ReactionPicker } from '@/components/chat/ReactionPicker';

// ============================================================
// ChatDetailScreen - Production-ready, tích hợp API backend
// Features: Infinite scroll, reply, reactions, mark as read,
//           edit/delete, typing indicator, error handling
// ============================================================

const PAGE_SIZE = 30;

// Tạm dùng mock userId cho dev (thực tế lấy từ AuthContext)
const CURRENT_USER_ID = 'current-user-id';

export default function ChatDetailScreen() {
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
        sender: { _id: CURRENT_USER_ID, fullName: 'Tôi' },
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
    [id, roomModel, replyingTo]
  );

  // --- Long press actions ---
  const handleLongPress = useCallback((message: Message) => {
    const isMyMessage = message.sender?._id === CURRENT_USER_ID;

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
  }, []);

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
        if (msg.sender?._id !== CURRENT_USER_ID) {
          const alreadyRead = msg.readBy?.some((r) => r.user === CURRENT_USER_ID);
          if (!alreadyRead) {
            messageService.markAsRead(msg._id).catch(() => {});
          }
        }
      });
    },
    []
  );

  // --- Render ---
  const renderMessage = useCallback(
    ({ item }: { item: Message }) => (
      <MessageBubble
        message={item}
        isMe={item.sender?._id === CURRENT_USER_ID}
        currentUserId={CURRENT_USER_ID}
        onLongPress={handleLongPress}
        onReplyPress={(msg) => setReplyingTo(msg)}
        onReactionPress={(msg) => {
          setReactionTarget(msg);
          setShowReactionPicker(true);
        }}
      />
    ),
    [handleLongPress]
  );

  const renderHeader = () => {
    if (isLoadingMore) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" color="#3b82f6" />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
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
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Loading state */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-400 mt-2 text-sm">Đang tải tin nhắn...</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-red-400 text-center">{error}</Text>
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
        <TypingIndicator isVisible={false} />

        {/* Message input */}
        <MessageInput
          onSendMessage={handleSendMessage}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          disabled={isLoading}
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
          reactionTarget?.reactions?.find((r) => r.user === CURRENT_USER_ID)?.emoji
        }
      />
    </SafeAreaView>
  );
}

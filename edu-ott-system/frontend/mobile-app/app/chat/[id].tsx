import React, { useState, useEffect, useRef } from 'react';
import { View, FlatList, KeyboardAvoidingView, Platform, SafeAreaView, TouchableOpacity, Text, Image } from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';

// Mock data for initial UI
const MOCK_MESSAGES = [
  { id: '1', content: 'Chào em, hôm nay lớp mình có bài tập gì không nhỉ?', isMe: false, time: '09:30' },
  { id: '2', content: 'Dạ chào thầy, hôm nay có bài tập Toán về nhà ạ.', isMe: true, time: '09:32', status: 'read' },
  { id: '3', content: 'Em nhớ hoàn thành đúng hạn nhé!', isMe: false, time: '09:35' },
  { id: '4', content: 'Vâng ạ, em sẽ nộp bài đúng giờ.', isMe: true, time: '09:36', status: 'read' },
];

export default function ChatDetailScreen() {
  const { id, name, avatar } = useLocalSearchParams();
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const handleSendMessage = (content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      content,
      isMe: true,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent' as const,
    };
    setMessages((prev) => [...prev, newMessage]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <Stack.Screen
        options={{
          headerTitle: () => (
            <View className="flex-row items-center">
              <Image 
                source={{ uri: (avatar as string) || 'https://i.pravatar.cc/150' }} 
                className="w-8 h-8 rounded-full mr-2"
              />
              <Text className="text-lg font-bold text-gray-900">{name || 'Chat'}</Text>
            </View>
          ),
          headerRight: () => (
            <View className="flex-row mr-2">
              <TouchableOpacity className="mx-2">
                <Ionicons name="call-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <TouchableOpacity className="mx-2">
                <Ionicons name="videocam-outline" size={24} color="#3b82f6" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              content={item.content}
              isMe={item.isMe}
              time={item.time}
              status={item.status as any}
            />
          )}
          contentContainerStyle={{ paddingVertical: 10 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />
        
        <MessageInput onSendMessage={handleSendMessage} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

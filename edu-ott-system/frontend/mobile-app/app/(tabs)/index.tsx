import { useState, useEffect } from 'react';
import { FlatList, View, SafeAreaView } from 'react-native';
import { ChatListItem } from '@/components/chat/ChatListItem';
import { fetchAPI } from '@/utils/api';

// Sample data in case API fails
const MOCK_CHATS = [
  { id: '1', name: 'Thầy Nguyễn Văn A', lastMessage: 'Hôm nay lớp mình nghỉ nhé!', avatar: 'https://i.pravatar.cc/150?u=1', time: '09:45', unreadCount: 2 },
  { id: '2', name: 'Nhóm Lớp 12A1', lastMessage: 'Bạn nào chưa nộp bài tập không?', avatar: 'https://i.pravatar.cc/150?u=2', time: '08:30', unreadCount: 0 },
  { id: '3', name: 'Cô Lê Thị B', lastMessage: 'Chào em, bài kiểm tra của em rất tốt.', avatar: 'https://i.pravatar.cc/150?u=3', time: 'Hôm qua', unreadCount: 0 },
  { id: '4', name: 'Hội Phụ Huynh', lastMessage: 'Thông báo về buổi họp phụ huynh...', avatar: 'https://i.pravatar.cc/150?u=4', time: 'Thứ 2', unreadCount: 5 },
];

export default function MessagesScreen() {
  const [chats, setChats] = useState<any[]>(MOCK_CHATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        const res = await fetchAPI('/conversations').catch(() => null);
        if (res && res.data) {
          setChats(res.data.conversations || res.data);
        }
      } catch (error) {
        console.log('Failed to fetch chats', error);
      } finally {
        setLoading(false);
      }
    };
    loadChats();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={chats}
        keyExtractor={item => item.id || item._id}
        renderItem={({ item }) => (
          <ChatListItem
            id={item.id || item._id}
            name={item.name}
            lastMessage={item.lastMessage || item.content}
            avatar={item.avatar}
            time={item.time || '10:00'}
            unreadCount={item.unreadCount || item.unread}
          />
        )}
        className="bg-white"
      />
    </SafeAreaView>
  );
}

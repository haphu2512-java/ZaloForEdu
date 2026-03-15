import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { fetchAPI } from '@/utils/api';

export default function MessagesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChats = async () => {
      try {
        // Here we attempt to fetch recent chats/conversations depending on backend API design.
        // Assuming /messages without roomId gives latest messages or conversations for user.
        // If there's another endpoint like /conversations, replace it accordingly.
        const res = await fetchAPI('/conversations').catch(() => fetchAPI('/messages'));
        setChats(res.data?.conversations || res.data?.messages || res.data || []);
      } catch (error) {
        console.log('Failed to fetch chats/messages', error);
      } finally {
        setLoading(false);
      }
    };
    loadChats();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.chatItem, { borderBottomColor: colors.border }]}>
      <Image source={{ uri: item.avatar || 'https://i.pravatar.cc/150' }} style={styles.avatar} />
      <View style={[styles.chatInfo, { backgroundColor: 'transparent' }]}>
        <View style={[styles.chatHeader, { backgroundColor: 'transparent' }]}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.time, { color: colors.muted }]}>{item.time || new Date(item.updatedAt || item.createdAt || Date.now()).toLocaleTimeString()}</Text>
        </View>
        <View style={[styles.chatFooter, { backgroundColor: 'transparent' }]}>
          <Text 
            style={[styles.message, { color: item.unread ? colors.text : colors.muted, fontWeight: item.unread ? '600' : 'normal' }]} 
            numberOfLines={1}
          >
            {item.lastMessage || item.content || 'Tin nhắn mới'}
          </Text>
          {item.unread > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.error }]}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={chats}
        keyExtractor={item => item.id || item._id}
        renderItem={renderItem}
        contentContainerStyle={{ backgroundColor: colors.surface }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: '600', flex: 1, marginRight: 10 },
  time: { fontSize: 13 },
  chatFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  message: { fontSize: 14, flex: 1, marginRight: 10 },
  unreadBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  unreadText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});

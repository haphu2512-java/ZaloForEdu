import { StyleSheet, FlatList, Image, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

const MOCK_CHATS = [
  { id: '1', name: 'Lớp Lập trình Web', avatar: 'https://i.pravatar.cc/150?u=1', lastMessage: 'Cô giáo: Các em nhớ làm bài tập nhé', time: '10:30', unread: 2, isClass: true },
  { id: '2', name: 'Nhóm 1 - Đồ án', avatar: 'https://i.pravatar.cc/150?u=2', lastMessage: 'Nam: Tối nay họp nha mọi người', time: '09:15', unread: 0, isGroup: true },
  { id: '3', name: 'Nguyễn Văn A', avatar: 'https://i.pravatar.cc/150?u=3', lastMessage: 'Gửi cho mình tài liệu với', time: 'Hôm qua', unread: 0 },
  { id: '4', name: 'Trần Thị B', avatar: 'https://i.pravatar.cc/150?u=4', lastMessage: 'Đã hoàn thành phần frontend!', time: 'Thứ 2', unread: 1 },
];

export default function MessagesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.chatItem, { borderBottomColor: colors.border }]}>
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      <View style={[styles.chatInfo, { backgroundColor: 'transparent' }]}>
        <View style={[styles.chatHeader, { backgroundColor: 'transparent' }]}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.time, { color: colors.muted }]}>{item.time}</Text>
        </View>
        <View style={[styles.chatFooter, { backgroundColor: 'transparent' }]}>
          <Text 
            style={[styles.message, { color: item.unread ? colors.text : colors.muted, fontWeight: item.unread ? '600' : 'normal' }]} 
            numberOfLines={1}
          >
            {item.lastMessage}
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
        data={MOCK_CHATS}
        keyExtractor={item => item.id}
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

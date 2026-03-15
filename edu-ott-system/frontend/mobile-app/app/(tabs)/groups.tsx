import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

const MOCK_GROUPS = [
  { id: '1', name: 'Nhóm 1 - Đồ án Web', class: 'INT3110', members: 5, leader: 'Nguyễn Văn A' },
  { id: '2', name: 'Nhóm 4 - BTL Mạng', class: 'INT3111', members: 4, leader: 'Trần Thị B' },
];

export default function GroupsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <View style={[styles.avatarGroup, { backgroundColor: colors.tint + '15' }]}>
          <FontAwesome name="users" size={24} color={colors.tint} />
        </View>
        <View style={[styles.info, { backgroundColor: 'transparent' }]}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={[styles.classLabel, { color: colors.muted }]}>Môn: {item.class}</Text>
        </View>
      </View>
      <View style={[styles.footer, { backgroundColor: 'transparent', borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.muted }]}>Leader: {item.leader}</Text>
        <View style={[styles.badge, { backgroundColor: colors.background }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{item.members} thành viên</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={MOCK_GROUPS}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 15, gap: 15 },
  card: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', padding: 15, alignItems: 'center' },
  avatarGroup: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  classLabel: { fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerText: { fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '500' }
});

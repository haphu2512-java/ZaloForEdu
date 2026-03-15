import { useState, useEffect } from 'react';
import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { fetchAPI } from '@/utils/api';

export default function GroupsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const res = await fetchAPI('/groups');
        setGroups(res.data?.groups || res.data || []);
      } catch (error) {
        console.log('Failed to fetch groups', error);
      } finally {
        setLoading(false);
      }
    };
    loadGroups();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.header, { backgroundColor: 'transparent' }]}>
        <View style={[styles.avatarGroup, { backgroundColor: colors.tint + '15' }]}>
          <FontAwesome name="users" size={24} color={colors.tint} />
        </View>
        <View style={[styles.info, { backgroundColor: 'transparent' }]}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={[styles.classLabel, { color: colors.muted }]}>Môn: {item.class?.name || item.class || 'Không rõ'}</Text>
        </View>
      </View>
      <View style={[styles.footer, { backgroundColor: 'transparent', borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.muted }]}>Leader: {item.leader?.name || item.leader || 'Không rõ'}</Text>
        <View style={[styles.badge, { backgroundColor: colors.background }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>{item.members?.length || item.members || 0} thành viên</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={groups}
        keyExtractor={item => item.id || item._id}
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

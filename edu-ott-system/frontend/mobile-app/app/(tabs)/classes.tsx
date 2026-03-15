import { StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

import { useState, useEffect } from 'react';
import { fetchAPI } from '@/utils/api';


export default function ClassesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await fetchAPI('/classes');
        setClasses(res.data?.classes || res.data || []);
      } catch (error) {
        console.log('Failed to fetch classes', error);
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.cardHeader, { backgroundColor: 'transparent' }]}>
        <View style={[styles.iconContainer, { backgroundColor: colors.tint + '20' }]}>
          <FontAwesome name="graduation-cap" size={20} color={colors.tint} />
        </View>
        <View style={[styles.headerText, { backgroundColor: 'transparent' }]}>
          <Text style={styles.code}>{item.code || item._id}</Text>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      
      <View style={[styles.cardFooter, { backgroundColor: 'transparent' }]}>
        <View style={[styles.infoRow, { backgroundColor: 'transparent' }]}>
          <FontAwesome name="user" size={14} color={colors.muted} style={{ marginRight: 5 }} />
          <Text style={[styles.infoText, { color: colors.muted }]}>{item.teacher?.name || item.teacher || 'Chưa rõ'}</Text>
        </View>
        <View style={[styles.infoRow, { backgroundColor: 'transparent' }]}>
          <FontAwesome name="users" size={14} color={colors.muted} style={{ marginRight: 5 }} />
          <Text style={[styles.infoText, { color: colors.muted }]}>{item.members?.length || item.members || 0} học viên</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={classes}
        keyExtractor={item => item.id || item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}

      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContainer: { padding: 15, gap: 15 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  iconContainer: { width: 40, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerText: { flex: 1 },
  code: { fontSize: 13, fontWeight: '700', color: '#0068FF', marginBottom: 2 },
  name: { fontSize: 16, fontWeight: '600' },
  divider: { height: 1, width: '100%', marginBottom: 15 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoText: { fontSize: 13 },
});

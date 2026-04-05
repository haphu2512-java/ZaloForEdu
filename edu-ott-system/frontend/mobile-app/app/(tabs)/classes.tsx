import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Image,
  TextInput,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';
import { useAuth } from '@/context/auth';
import { useRouter } from 'expo-router';

interface ClassItem {
  _id: string;
  name: string;
  code: string;
  description?: string;
  subject: string;
  semester?: string;
  academicYear?: string;
  coverImage?: string;
  teacher?: { _id: string; fullName: string; email?: string };
  students?: string[];
  maxStudents?: number;
  status: 'active' | 'completed' | 'archived';
  settings?: { allowStudentPost?: boolean; allowFileUpload?: boolean; requireApproval?: boolean };
  createdAt: string;
  updatedAt: string;
}

function getStatusStyle(status: string): { label: string; color: string; bg: string } {
  switch (status) {
    case 'active':
      return { label: 'Đang hoạt động', color: '#10B981', bg: '#10B98115' };
    case 'completed':
      return { label: 'Đã kết thúc', color: '#6B7280', bg: '#6B728015' };
    case 'archived':
      return { label: 'Đã lưu trữ', color: '#F59E0B', bg: '#F59E0B15' };
    default:
      return { label: status, color: '#6B7280', bg: '#6B728015' };
  }
}

export default function ClassesScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const router = useRouter();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'archived'>('all');

  const loadClasses = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '50');

      const queryStr = params.toString();
      const res = await fetchAPI(`/classes${queryStr ? '?' + queryStr : ''}`);
      setClasses(res.data?.classes || []);
    } catch (error: any) {
      console.log('Failed to fetch classes:', error.message);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadClasses();
      setLoading(false);
    };
    init();
  }, [loadClasses]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadClasses();
    setRefreshing(false);
  }, [loadClasses]);

  const handleJoinClass = async (classId: string) => {
    Alert.alert('Tham gia lớp', 'Bạn có muốn tham gia lớp học này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Tham gia',
        onPress: async () => {
          try {
            await fetchAPI(`/classes/${classId}/join`, { method: 'POST' });
            Alert.alert('Thành công ✅', 'Đã tham gia lớp học!');
            await loadClasses();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể tham gia lớp học');
          }
        },
      },
    ]);
  };

  const handleLeaveClass = async (classId: string) => {
    Alert.alert('Rời lớp', 'Bạn có chắc chắn muốn rời khỏi lớp học này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời lớp',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetchAPI(`/classes/${classId}/leave`, { method: 'POST' });
            Alert.alert('Thành công', 'Đã rời khỏi lớp học');
            await loadClasses();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message || 'Không thể rời lớp');
          }
        },
      },
    ]);
  };

  const handleClassPress = (item: ClassItem) => {
    // Navigate to class detail screen
    router.push({
      pathname: '/class/[id]' as any,
      params: { id: item._id },
    });
  };

  const handleClassChat = (item: ClassItem) => {
    router.push({
      pathname: '/chat/[id]' as any,
      params: {
        id: item._id,
        name: `Lớp ${item.name}`,
        avatar: item.coverImage || '',
        roomModel: 'Class',
      },
    });
  };

  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const FilterChip = ({ label, value }: { label: string; value: typeof filter }) => (
    <TouchableOpacity
      onPress={() => setFilter(value)}
      style={[
        styles.filterChip,
        {
          backgroundColor: filter === value ? colors.tint : colors.surface,
          borderColor: filter === value ? colors.tint : colors.border,
        },
      ]}
    >
      <Text style={{ color: filter === value ? '#fff' : colors.text, fontSize: 13, fontWeight: '600' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ClassItem }) => {
    const statusInfo = getStatusStyle(item.status);
    const studentCount = item.students?.length || 0;
    const isMember =
      item.teacher?._id === user?._id || item.students?.includes(user?._id || '');

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleClassPress(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={[styles.cardHeader, { backgroundColor: 'transparent' }]}>
          <View style={[styles.iconContainer, { backgroundColor: colors.tint + '15' }]}>
            <Ionicons name="school" size={22} color={colors.tint} />
          </View>
          <View style={[styles.headerText, { backgroundColor: 'transparent' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent' }}>
              <Text style={[styles.code, { color: colors.tint }]}>{item.code}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusInfo.color, marginRight: 4 }} />
                <Text style={{ fontSize: 10, fontWeight: '600', color: statusInfo.color }}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
        </View>

        {/* Subject & Semester */}
        <View style={[styles.infoSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.infoItem, { backgroundColor: 'transparent' }]}>
            <Ionicons name="book-outline" size={14} color={colors.muted} />
            <Text style={[styles.infoText, { color: colors.text }]}>{item.subject}</Text>
          </View>
          {item.semester && (
            <View style={[styles.infoItem, { backgroundColor: 'transparent' }]}>
              <Ionicons name="calendar-outline" size={14} color={colors.muted} />
              <Text style={[styles.infoText, { color: colors.text }]}>
                {item.semester} {item.academicYear ? `- ${item.academicYear}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { backgroundColor: 'transparent' }]}>
          <View style={[styles.footerLeft, { backgroundColor: 'transparent' }]}>
            <View style={[styles.footerItem, { backgroundColor: 'transparent' }]}>
              <Ionicons name="person-outline" size={14} color={colors.muted} />
              <Text style={[styles.footerText, { color: colors.muted }]}>
                {item.teacher?.fullName || 'Chưa rõ'}
              </Text>
            </View>
            <View style={[styles.footerItem, { backgroundColor: 'transparent' }]}>
              <Ionicons name="people-outline" size={14} color={colors.muted} />
              <Text style={[styles.footerText, { color: colors.muted }]}>
                {studentCount}{item.maxStudents ? `/${item.maxStudents}` : ''} học viên
              </Text>
            </View>
          </View>

          {/* Action button */}
          {item.status === 'active' && !isTeacher && !isMember && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.tint }]}
              onPress={() => handleJoinClass(item._id)}
            >
              <Ionicons name="enter-outline" size={14} color="#fff" />
              <Text style={styles.actionBtnText}>Tham gia</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.tint + '15' }]}>
        <Ionicons name="school-outline" size={48} color={colors.tint} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có lớp học</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        {isTeacher
          ? 'Bạn chưa tạo lớp học nào'
          : 'Hãy tham gia lớp học để bắt đầu'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Tìm lớp học..."
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          <FilterChip label="Tất cả" value="all" />
          <FilterChip label="Đang học" value="active" />
          <FilterChip label="Kết thúc" value="completed" />
          <FilterChip label="Lưu trữ" value="archived" />
        </View>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />
        }
        contentContainerStyle={[styles.listContent, classes.length === 0 ? { flex: 1 } : {}]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Create Class (teacher/admin only) */}
      {isTeacher && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/class/create' as any)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },

  listContent: { padding: 16, gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerText: { flex: 1 },
  code: { fontSize: 13, fontWeight: '700', marginRight: 8 },
  name: { fontSize: 16, fontWeight: '600', marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },

  infoSection: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  infoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flex: 1, gap: 4 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontSize: 13 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#007AFF', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
});

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

interface MemberInfo {
  user: { _id: string; fullName: string; email?: string; avatar?: string };
  role: 'leader' | 'member';
  joinedAt: string;
}

interface GroupItem {
  _id: string;
  name: string;
  description?: string;
  avatar?: string;
  class?: { _id: string; name: string; code?: string };
  members: MemberInfo[];
  createdBy?: { _id: string; fullName: string };
  maxMembers?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function GroupsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user } = useAuth();
  const router = useRouter();

  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadGroups = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      const res = await fetchAPI(`/groups?${params.toString()}`);
      setGroups(res.data?.groups || []);
    } catch (error: any) {
      console.log('Failed to fetch groups:', error.message);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadGroups();
      setLoading(false);
    };
    init();
  }, [loadGroups]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadGroups();
    setRefreshing(false);
  }, [loadGroups]);

  const handleGroupPress = (item: GroupItem) => {
    // Navigate to group detail screen
    router.push({
      pathname: '/group/[id]' as any,
      params: { id: item._id },
    });
  };

  const getLeader = (members: MemberInfo[]): string => {
    const leader = members?.find((m) => m.role === 'leader');
    return leader?.user?.fullName || 'Chưa có';
  };

  const getMemberAvatars = (members: MemberInfo[]): string[] => {
    return (members || [])
      .slice(0, 4)
      .map(
        (m) =>
          m.user?.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user?.fullName || '?')}&background=6366F1&color=fff&size=80&bold=true`
      );
  };

  const isMember = (item: GroupItem): boolean => {
    return item.members?.some((m) => m.user?._id === user?._id) || false;
  };

  // Filter by search
  const filteredGroups = searchQuery.trim()
    ? groups.filter(
        (g) =>
          g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          g.class?.name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : groups;

  const renderItem = ({ item }: { item: GroupItem }) => {
    const memberCount = item.members?.length || 0;
    const leader = getLeader(item.members);
    const avatars = getMemberAvatars(item.members);

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => handleGroupPress(item)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={[styles.cardHeader, { backgroundColor: 'transparent' }]}>
          <View style={[styles.groupAvatar, { backgroundColor: '#8B5CF615' }]}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={{ width: 48, height: 48, borderRadius: 14 }} />
            ) : (
              <Ionicons name="people" size={24} color="#8B5CF6" />
            )}
          </View>
          <View style={[styles.headerInfo, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.groupName, { color: colors.text }]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.class && (
              <View style={[styles.classTag, { backgroundColor: colors.tint + '12' }]}>
                <Ionicons name="school-outline" size={12} color={colors.tint} />
                <Text style={{ fontSize: 12, color: colors.tint, fontWeight: '500', marginLeft: 4 }}>
                  {item.class.name}
                </Text>
              </View>
            )}
          </View>
          {item.isActive ? (
            <View style={[styles.activeDot, { backgroundColor: '#10B981' }]} />
          ) : (
            <View style={[styles.activeDot, { backgroundColor: '#9CA3AF' }]} />
          )}
        </View>

        {/* Description */}
        {item.description && (
          <Text style={[styles.description, { color: colors.muted }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Members preview */}
        <View style={[styles.membersSection, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={[styles.avatarStack, { backgroundColor: 'transparent' }]}>
            {avatars.map((uri, idx) => (
              <Image
                key={idx}
                source={{ uri }}
                style={[
                  styles.stackAvatar,
                  { marginLeft: idx === 0 ? 0 : -10, zIndex: avatars.length - idx },
                ]}
              />
            ))}
            {memberCount > 4 && (
              <View style={[styles.moreAvatars, { marginLeft: -10 }]}>
                <Text style={styles.moreAvatarsText}>+{memberCount - 4}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.memberCount, { color: colors.muted }]}>
            {memberCount}{item.maxMembers ? `/${item.maxMembers}` : ''} thành viên
          </Text>
        </View>

        {/* Footer */}
        <View style={[styles.cardFooter, { backgroundColor: 'transparent', borderTopColor: colors.border }]}>
          <View style={[styles.leaderInfo, { backgroundColor: 'transparent' }]}>
            <Ionicons name="star" size={14} color="#F59E0B" />
            <Text style={[styles.leaderText, { color: colors.muted }]}>Trưởng nhóm: </Text>
            <Text style={[styles.leaderName, { color: colors.text }]}>{leader}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: '#8B5CF615' }]}>
        <Ionicons name="people-outline" size={48} color="#8B5CF6" />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Chưa có nhóm</Text>
      <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
        Bạn chưa tham gia nhóm nào. Hãy tạo hoặc tham gia nhóm trong lớp học.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            placeholder="Tìm nhóm..."
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
      </View>

      <FlatList
        data={filteredGroups}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" />
        }
        contentContainerStyle={[styles.listContent, filteredGroups.length === 0 ? { flex: 1 } : {}]}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB - Create Group */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/group/create' as any)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  searchContainer: { paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
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

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  classTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  activeDot: { width: 10, height: 10, borderRadius: 5 },

  description: { fontSize: 13, lineHeight: 18, marginBottom: 12 },

  membersSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarStack: { flexDirection: 'row', alignItems: 'center' },
  stackAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: '#fff' },
  moreAvatars: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  moreAvatarsText: { fontSize: 10, fontWeight: '700', color: '#6B7280' },
  memberCount: { fontSize: 13, fontWeight: '500' },

  cardFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  leaderInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  leaderText: { fontSize: 13 },
  leaderName: { fontSize: 13, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
});

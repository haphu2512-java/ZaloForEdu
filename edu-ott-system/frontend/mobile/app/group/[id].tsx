import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';
import { useAuth } from '@/context/auth';
import { AddMemberModal } from '@/components/AddMemberModal';

interface MemberInfo {
  user: { _id: string; fullName: string; email?: string; avatar?: string };
  role: 'leader' | 'member';
  joinedAt: string;
}

interface GroupDetail {
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

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetchAPI(`/groups/${id}`);
      setGroup(res.data?.group || null);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải thông tin nhóm');
    }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadData();
      setLoading(false);
    })();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const isLeader = group?.members?.some(
    (m) => m.user?._id === user?._id && m.role === 'leader'
  );
  const isCreator = group?.createdBy?._id === user?._id;
  const isAdmin = user?.role === 'admin';
  const canManage = isLeader || isCreator || isAdmin;
  const isMember = group?.members?.some((m) => m.user?._id === user?._id);

  const handleDelete = async () => {
    Alert.alert('Xóa nhóm', 'Hành động này không thể hoàn tác. Bạn có chắc?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await fetchAPI(`/groups/${id}`, { method: 'DELETE' });
            Alert.alert('Đã xóa', 'Nhóm đã được xóa');
            router.back();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    Alert.alert('Xóa thành viên', `Bạn có chắc muốn xóa ${memberName} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await fetchAPI(`/groups/${id}/members/${userId}`, { method: 'DELETE' });
            Alert.alert('Thành công', 'Đã xóa thành viên');
            await loadData();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  };

  const handleOpenChat = () => {
    router.push({
      pathname: '/chat/[id]' as any,
      params: { id: group!._id, name: group!.name, avatar: group?.avatar || '', roomModel: 'Group' },
    });
  };

  const handleAddMember = async (userId: string) => {
    await fetchAPI(`/groups/${id}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    await loadData();
  };

  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 16 }}>Không tìm thấy nhóm</Text>
        <TouchableOpacity style={s.primaryBtn} onPress={() => router.back()}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const leader = group.members?.find((m) => m.role === 'leader');
  const regularMembers = group.members?.filter((m) => m.role === 'member') || [];

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Chi tiết nhóm</Text>
        {canManage && (
          <TouchableOpacity onPress={handleDelete} style={[s.headerBtn, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        )}
        {!canManage && <View style={{ width: 38 }} />}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Group Info Card */}
        <View style={s.infoCard}>
          {/* Group icon */}
          <View style={s.groupIconRow}>
            <View style={s.groupIcon}>
              {group.avatar ? (
                <Image source={{ uri: group.avatar }} style={{ width: 60, height: 60, borderRadius: 20 }} />
              ) : (
                <Ionicons name="people" size={30} color="#8B5CF6" />
              )}
            </View>
            <View style={[s.statusDot, { backgroundColor: group.isActive ? '#10B981' : '#9CA3AF' }]} />
          </View>

          <Text style={s.groupName}>{group.name}</Text>
          {group.description && <Text style={s.groupDesc}>{group.description}</Text>}

          {/* Linked class */}
          {group.class && (
            <TouchableOpacity
              style={s.classLink}
              onPress={() => router.push({ pathname: '/class/[id]' as any, params: { id: group.class!._id } })}
            >
              <Ionicons name="school-outline" size={16} color="#007AFF" />
              <Text style={s.classLinkText}>Lớp: {group.class.name}</Text>
              <Ionicons name="chevron-forward" size={14} color="#007AFF" />
            </TouchableOpacity>
          )}

          {/* Info */}
          <View style={s.detailGrid}>
            <DetailRow icon="person-outline" label="Người tạo" value={group.createdBy?.fullName || 'N/A'} />
            <DetailRow icon="people-outline" label="Thành viên" value={`${group.members?.length || 0}${group.maxMembers ? '/' + group.maxMembers : ''}`} />
            <DetailRow icon="calendar-outline" label="Ngày tạo" value={new Date(group.createdAt).toLocaleDateString('vi-VN')} />
          </View>
        </View>

        {/* Action buttons */}
        <View style={s.actionBar}>
          {isMember && (
            <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#8B5CF6' }]} onPress={handleOpenChat}>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Nhắn tin nhóm</Text>
            </TouchableOpacity>
          )}
          {canManage && (
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#6366F1' }]}
              onPress={() => Alert.alert('Thông báo', 'Màn hình chỉnh sửa nhóm đang được phát triển.')}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Members List */}
        <View style={s.membersCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={s.membersTitle}>Thành viên ({group.members?.length || 0})</Text>
            {canManage && (
              <TouchableOpacity onPress={() => setShowAddMember(true)}>
                <Text style={{ color: '#8B5CF6', fontWeight: '600' }}>+ Thêm</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Leader */}
          {leader && (
            <View>
              <Text style={s.roleGroupTitle}>Trưởng nhóm</Text>
              <MemberItem member={leader} canRemove={false} onRemove={() => {}} />
            </View>
          )}

          {/* Members */}
          {regularMembers.length > 0 && (
            <View>
              <Text style={s.roleGroupTitle}>Thành viên</Text>
              {regularMembers.map((m) => (
                <MemberItem
                  key={m.user._id}
                  member={m}
                  canRemove={canManage}
                  onRemove={() => handleRemoveMember(m.user._id, m.user.fullName)}
                />
              ))}
            </View>
          )}

          {(!group.members || group.members.length === 0) && (
            <Text style={s.emptyText}>Chưa có thành viên nào</Text>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Member Modal */}
      {canManage && (
        <AddMemberModal
          visible={showAddMember}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddMember}
          title="Thêm thành viên nhóm"
        />
      )}
    </View>
  );
}

// ===== Sub-components =====

function DetailRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={16} color="#6B7280" />
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

function MemberItem({
  member, canRemove, onRemove,
}: {
  member: MemberInfo; canRemove: boolean; onRemove: () => void;
}) {
  const roleColors: Record<string, { bg: string; text: string; label: string }> = {
    leader: { bg: '#F59E0B15', text: '#F59E0B', label: 'Leader' },
    member: { bg: '#8B5CF615', text: '#8B5CF6', label: 'Member' },
  };
  const rc = roleColors[member.role] || roleColors.member;

  return (
    <View style={s.memberRow}>
      <Image
        source={{
          uri: member.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.user.fullName)}&background=6366F1&color=fff&size=80`,
        }}
        style={s.memberAvatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={s.memberName}>{member.user.fullName}</Text>
        {member.user.email && <Text style={s.memberEmail}>{member.user.email}</Text>}
      </View>
      <View style={[s.roleBadge, { backgroundColor: rc.bg }]}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: rc.text }}>{rc.label}</Text>
      </View>
      {canRemove && (
        <TouchableOpacity onPress={onRemove} style={s.removeBtn}>
          <Ionicons name="close-circle" size={22} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ===== Styles =====
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  primaryBtn: { backgroundColor: '#8B5CF6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center', marginHorizontal: 8 },

  infoCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  groupIconRow: { position: 'relative', marginBottom: 12 },
  groupIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#8B5CF612', alignItems: 'center', justifyContent: 'center' },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#fff' },
  groupName: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4, textAlign: 'center' },
  groupDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginBottom: 12, lineHeight: 20 },

  classLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#007AFF10', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, marginBottom: 14,
  },
  classLinkText: { fontSize: 14, color: '#007AFF', fontWeight: '500' },

  detailGrid: { width: '100%', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 10 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 13, color: '#6B7280', width: 80 },
  detailValue: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },

  actionBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16, flexWrap: 'wrap' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  membersCard: { marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  membersTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  roleGroupTitle: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', marginTop: 10, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  memberRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6', gap: 4,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  removeBtn: { marginLeft: 8 },
  emptyText: { color: '#9CA3AF', fontSize: 14, fontStyle: 'italic', paddingVertical: 16, textAlign: 'center' },
});

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { fetchAPI } from '@/utils/api';
import { useAuth } from '@/context/auth';
import { AddMemberModal } from '@/components/AddMemberModal';

interface ClassDetail {
  _id: string;
  name: string;
  code: string;
  description?: string;
  subject: string;
  semester?: string;
  academicYear?: string;
  coverImage?: string;
  teacher?: { _id: string; fullName: string; email?: string; avatar?: string };
  students?: Array<{ _id: string; fullName: string; email?: string; avatar?: string }>;
  maxStudents?: number;
  status: 'active' | 'completed' | 'archived';
  settings?: { allowStudentPost?: boolean; allowFileUpload?: boolean; requireApproval?: boolean };
  createdAt: string;
  updatedAt: string;
}

interface MembersData {
  teacher: { _id: string; fullName: string; email?: string; avatar?: string };
  students: Array<{ _id: string; fullName: string; email?: string; avatar?: string }>;
  totalMembers: number;
}

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [classData, setClassData] = useState<ClassDetail | null>(null);
  const [members, setMembers] = useState<MembersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'members'>('info');
  const [showAddMember, setShowAddMember] = useState(false);

  const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'admin';
  const isClassTeacher = classData?.teacher?._id === user?._id;
  const canManage = isClassTeacher || user?.role === 'admin';
  const isMember =
    classData?.teacher?._id === user?._id ||
    classData?.students?.some((s: any) => (typeof s === 'string' ? s : s._id) === user?._id);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [classRes, membersRes] = await Promise.all([
        fetchAPI(`/classes/${id}`),
        fetchAPI(`/classes/${id}/members`).catch(() => null),
      ]);
      setClassData(classRes.data?.class || null);
      if (membersRes?.data) setMembers(membersRes.data);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải thông tin lớp');
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

  const handleJoin = async () => {
    try {
      await fetchAPI(`/classes/${id}/join`, { method: 'POST' });
      Alert.alert('Thành công ✅', 'Đã tham gia lớp học!');
      await loadData();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    }
  };

  const handleLeave = async () => {
    Alert.alert('Rời lớp', 'Bạn có chắc chắn muốn rời khỏi lớp?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời lớp', style: 'destructive',
        onPress: async () => {
          try {
            await fetchAPI(`/classes/${id}/leave`, { method: 'POST' });
            Alert.alert('Thành công', 'Đã rời lớp');
            router.back();
          } catch (err: any) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  };

  const handleDelete = async () => {
    Alert.alert('Xóa lớp học', 'Hành động này không thể hoàn tác. Bạn có chắc chắn?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          try {
            await fetchAPI(`/classes/${id}`, { method: 'DELETE' });
            Alert.alert('Đã xóa', 'Lớp học đã được xóa');
            router.back();
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
      params: { id: classData!._id, name: `Lớp ${classData!.name}`, avatar: classData?.coverImage || '', roomModel: 'Class' },
    });
  };

  const handleAddStudent = async (userId: string) => {
    await fetchAPI(`/classes/${id}/add-student`, {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    await loadData();
  };

  if (loading) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (!classData) {
    return (
      <View style={s.center}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={s.errorText}>Không tìm thấy lớp học</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={{ color: '#fff', fontWeight: '600' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColors: Record<string, string> = { active: '#10B981', completed: '#6B7280', archived: '#F59E0B' };
  const statusLabels: Record<string, string> = { active: 'Đang hoạt động', completed: 'Kết thúc', archived: 'Lưu trữ' };
  const statusColor = statusColors[classData.status] || '#6B7280';

  return (
    <View style={s.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={s.headerTitle} numberOfLines={1}>Chi tiết lớp học</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {canManage && (
            <TouchableOpacity onPress={handleDelete} style={[s.headerBtn, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Class Info Card */}
        <View style={s.heroCard}>
          <View style={s.heroTop}>
            <View style={s.iconCircle}>
              <Ionicons name="school" size={28} color="#007AFF" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Text style={s.classCode}>{classData.code}</Text>
                <View style={[s.statusPill, { backgroundColor: statusColor + '15' }]}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: statusColor }} />
                  <Text style={{ fontSize: 11, fontWeight: '600', color: statusColor, marginLeft: 4 }}>
                    {statusLabels[classData.status]}
                  </Text>
                </View>
              </View>
              <Text style={s.className}>{classData.name}</Text>
            </View>
          </View>

          {classData.description && (
            <Text style={s.description}>{classData.description}</Text>
          )}

          {/* Info grid */}
          <View style={s.infoGrid}>
            <InfoRow icon="book-outline" label="Môn học" value={classData.subject} />
            {classData.semester && (
              <InfoRow icon="calendar-outline" label="Học kỳ" value={`${classData.semester} ${classData.academicYear || ''}`} />
            )}
            <InfoRow icon="person-outline" label="Giảng viên" value={classData.teacher?.fullName || 'Chưa rõ'} />
            <InfoRow
              icon="people-outline"
              label="Sĩ số"
              value={`${classData.students?.length || 0}${classData.maxStudents ? '/' + classData.maxStudents : ''} học viên`}
            />
          </View>

          {/* Settings (only for teacher/admin) */}
          {canManage && classData.settings && (
            <View style={s.settingsSection}>
              <Text style={s.settingsTitle}>Cài đặt lớp</Text>
              <SettingRow label="Cho phép SV đăng bài" enabled={classData.settings.allowStudentPost} />
              <SettingRow label="Cho phép tải tệp" enabled={classData.settings.allowFileUpload} />
              <SettingRow label="Yêu cầu phê duyệt" enabled={classData.settings.requireApproval} />
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={s.actionBar}>
          {isMember && (
            <TouchableOpacity style={[s.actionButton, { backgroundColor: '#007AFF' }]} onPress={handleOpenChat}>
              <Ionicons name="chatbubble-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Nhắn tin</Text>
            </TouchableOpacity>
          )}
          {!isMember && classData.status === 'active' && (
            <TouchableOpacity style={[s.actionButton, { backgroundColor: '#10B981' }]} onPress={handleJoin}>
              <Ionicons name="enter-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Tham gia lớp</Text>
            </TouchableOpacity>
          )}
          {isMember && !isClassTeacher && (
            <TouchableOpacity style={[s.actionButton, { backgroundColor: '#EF4444' }]} onPress={handleLeave}>
              <Ionicons name="exit-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Rời lớp</Text>
            </TouchableOpacity>
          )}
          {canManage && (
            <TouchableOpacity
              style={[s.actionButton, { backgroundColor: '#6366F1' }]}
              onPress={() => Alert.alert('Thông báo', 'Màn hình chỉnh sửa lớp đang được phát triển.')}
            >
              <Ionicons name="create-outline" size={18} color="#fff" />
              <Text style={s.actionBtnText}>Chỉnh sửa</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tabs */}
        <View style={s.tabBar}>
          <TouchableOpacity
            style={[s.tab, activeTab === 'info' && s.tabActive]}
            onPress={() => setActiveTab('info')}
          >
            <Text style={[s.tabText, activeTab === 'info' && s.tabTextActive]}>Thông tin</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tab, activeTab === 'members' && s.tabActive]}
            onPress={() => setActiveTab('members')}
          >
            <Text style={[s.tabText, activeTab === 'members' && s.tabTextActive]}>
              Thành viên ({members?.totalMembers || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'members' && members && (
          <View style={s.membersSection}>
            {/* Teacher */}
            {members.teacher && (
              <View>
                <Text style={s.memberGroupTitle}>Giảng viên</Text>
                <MemberRow user={members.teacher} role="teacher" />
              </View>
            )}

            {/* Students */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <Text style={s.memberGroupTitle}>Sinh viên ({members.students?.length || 0})</Text>
              {canManage && (
                <TouchableOpacity onPress={() => setShowAddMember(true)}>
                  <Text style={{ color: '#007AFF', fontWeight: '600' }}>+ Thêm</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {members.students?.map((student) => (
              <MemberRow key={student._id} user={student} role="student" />
            ))}
            {(!members.students || members.students.length === 0) && (
              <Text style={s.emptyMember}>Chưa có sinh viên nào</Text>
            )}
          </View>
        )}

        {activeTab === 'info' && (
          <View style={s.infoTab}>
            <Text style={s.infoLabel}>Ngày tạo</Text>
            <Text style={s.infoValue}>{new Date(classData.createdAt).toLocaleDateString('vi-VN')}</Text>
            <Text style={s.infoLabel}>Cập nhật lần cuối</Text>
            <Text style={s.infoValue}>{new Date(classData.updatedAt).toLocaleDateString('vi-VN')}</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Member Modal */}
      {canManage && (
        <AddMemberModal
          visible={showAddMember}
          onClose={() => setShowAddMember(false)}
          onAdd={handleAddStudent}
          title="Thêm sinh viên vào lớp"
        />
      )}
    </View>
  );
}

// ===== Sub-components =====

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color="#6B7280" />
      <Text style={s.infoLabel2}>{label}</Text>
      <Text style={s.infoValue2} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function SettingRow({ label, enabled }: { label: string; enabled?: boolean }) {
  return (
    <View style={s.settingRow}>
      <Text style={s.settingLabel}>{label}</Text>
      <View style={[s.settingDot, { backgroundColor: enabled ? '#10B981' : '#D1D5DB' }]} />
    </View>
  );
}

function MemberRow({ user, role }: { user: { _id: string; fullName: string; email?: string; avatar?: string }; role: string }) {
  return (
    <View style={s.memberRow}>
      <Image
        source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366F1&color=fff&size=80` }}
        style={s.memberAvatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={s.memberName}>{user.fullName}</Text>
        {user.email && <Text style={s.memberEmail}>{user.email}</Text>}
      </View>
      <View style={[s.roleBadge, { backgroundColor: role === 'teacher' ? '#F59E0B15' : '#007AFF15' }]}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: role === 'teacher' ? '#F59E0B' : '#007AFF' }}>
          {role === 'teacher' ? 'GV' : 'SV'}
        </Text>
      </View>
    </View>
  );
}

// ===== Styles =====
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F7FA' },
  errorText: { fontSize: 16, color: '#6B7280', marginBottom: 16 },
  backBtn: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
  },
  headerBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111827', flex: 1, textAlign: 'center', marginHorizontal: 8 },

  heroCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  heroTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 14 },
  iconCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: '#007AFF12', alignItems: 'center', justifyContent: 'center' },
  classCode: { fontSize: 14, fontWeight: '700', color: '#007AFF' },
  className: { fontSize: 20, fontWeight: '700', color: '#111827' },
  description: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginBottom: 14 },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },

  infoGrid: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoLabel2: { fontSize: 13, color: '#6B7280', width: 80 },
  infoValue2: { fontSize: 13, fontWeight: '600', color: '#111827', flex: 1 },

  settingsSection: { marginTop: 14, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E7EB' },
  settingsTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 8 },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  settingLabel: { fontSize: 13, color: '#6B7280' },
  settingDot: { width: 10, height: 10, borderRadius: 5 },

  actionBar: { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 16, flexWrap: 'wrap' },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#007AFF' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },

  membersSection: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  memberGroupTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10, marginTop: 6 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  memberName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  memberEmail: { fontSize: 12, color: '#9CA3AF', marginTop: 1 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  emptyMember: { color: '#9CA3AF', fontSize: 14, fontStyle: 'italic', paddingVertical: 12 },

  infoTab: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  infoLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '500', marginTop: 8, marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#111827', fontWeight: '500' },
});

import { useState, useEffect } from 'react';
import { StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { fetchAPI } from '@/utils/api';

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetchAPI('/users/me'); // Getting current user info
        setProfile(res.data?.user || res.data || {});
      } catch (error) {
        console.log('Failed to fetch profile', error);
        // Fallback or empty if not logged in
        setProfile({
          fullName: 'Tài khoản Khách',
          studentId: 'N/A',
          role: 'Người dùng',
          avatar: 'https://i.pravatar.cc/150'
        });
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const MenuItem = ({ icon, title, color = colors.text }: { icon: string, title: string, color?: string }) => (
    <TouchableOpacity style={[styles.menuItem, { borderBottomColor: colors.border }]}>
      <View style={[styles.menuIcon, { backgroundColor: colors.background }]}>
        <FontAwesome name={icon as any} size={18} color={color} />
      </View>
      <Text style={[styles.menuText, { color }]}>{title}</Text>
      <FontAwesome name="chevron-right" size={14} color={colors.muted} />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Profile */}
      <View style={[styles.profileCard, { backgroundColor: colors.surface }]}>
        <Image style={styles.avatar} source={{ uri: profile?.avatar || 'https://i.pravatar.cc/150?u=current' }} />
        <View style={[styles.profileInfo, { backgroundColor: 'transparent' }]}>
          <Text style={styles.name}>{profile?.fullName || profile?.name || 'Tên người dùng'}</Text>
          <Text style={[styles.studentId, { color: colors.muted }]}>SV: {profile?.studentId || 'Không rõ'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.tint + '20' }]}>
            <Text style={[styles.roleText, { color: colors.tint }]}>{profile?.role === 'teacher' ? 'Giảng viên' : (profile?.role === 'admin' ? 'Quản trị viên' : 'Sinh viên')}</Text>
          </View>
        </View>
      </View>


      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface, marginTop: 10 }]}>
        <View style={[styles.statItem, { backgroundColor: 'transparent' }]}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Lớp học</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.statItem, { backgroundColor: 'transparent' }]}>
          <Text style={styles.statNumber}>5</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Nhóm</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={[styles.statItem, { backgroundColor: 'transparent' }]}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={[styles.statLabel, { color: colors.muted }]}>Tài liệu</Text>
        </View>
      </View>

      {/* Menu Settings */}
      <View style={[styles.menuContainer, { backgroundColor: colors.surface, marginTop: 10 }]}>
        <MenuItem icon="user" title="Thông tin cá nhân" />
        <MenuItem icon="bell" title="Thông báo" />
        <MenuItem icon="lock" title="Quyền riêng tư" />
        <MenuItem icon="language" title="Ngôn ngữ" />
        <MenuItem icon="sign-out" title="Đăng xuất" color={colors.error} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { flexDirection: 'row', padding: 20, alignItems: 'center' },
  avatar: { width: 70, height: 70, borderRadius: 35, marginRight: 15 },
  profileInfo: { flex: 1, justifyContent: 'center', alignItems: 'flex-start' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  studentId: { fontSize: 14, marginBottom: 8 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  roleText: { fontSize: 12, fontWeight: '600' },
  
  statsContainer: { flexDirection: 'row', padding: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  statLabel: { fontSize: 13 },
  statDivider: { width: 1, height: '80%', alignSelf: 'center' },
  
  menuContainer: { paddingHorizontal: 20, paddingVertical: 10, marginBottom: 30 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: StyleSheet.hairlineWidth },
  menuIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, fontWeight: '500' }
});

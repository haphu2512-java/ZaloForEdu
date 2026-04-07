import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Platform,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import * as authService from '@/utils/authService';
import * as ImagePicker from 'expo-image-picker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type EditableFields = {
  fullName: string;
  phoneNumber: string;
  bio: string;
  department: string;
  dateOfBirth: string;
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, logout, updateUser, refreshUser, setUser } = useAuth();

  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);

  // Edit Profile fields
  const [editFields, setEditFields] = useState<EditableFields>({
    fullName: '',
    phoneNumber: '',
    bio: '',
    department: '',
    dateOfBirth: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Change Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Avatar URL input
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) {
      setEditFields({
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        department: user.department || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
      });
    }
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  }, []);

  // ==================== EDIT PROFILE ====================
  const handleSaveProfile = async () => {
    if (!editFields.fullName.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống');
      return;
    }
    setIsUpdating(true);
    try {
      await updateUser({
        fullName: editFields.fullName.trim(),
        phoneNumber: editFields.phoneNumber.trim() || undefined,
        bio: editFields.bio.trim(),
        department: editFields.department.trim() || undefined,
        dateOfBirth: editFields.dateOfBirth || undefined,
      });
      setEditModalVisible(false);
      Alert.alert('Thành công ✅', 'Hồ sơ đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật thất bại');
    } finally {
      setIsUpdating(false);
    }
  };

  // ==================== CHANGE PASSWORD ====================
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Lỗi', 'Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Lỗi', 'Mật khẩu mới nhập lại không khớp');
      return;
    }
    setIsChangingPassword(true);
    try {
      await authService.changePassword({ currentPassword, newPassword });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      Alert.alert('Thành công ✅', 'Mật khẩu đã được thay đổi!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đổi mật khẩu thất bại');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==================== CHANGE AVATAR ====================
  const handlePickAvatarFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Thiếu quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh để chọn ảnh đại diện.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setAvatarUrl(result.assets[0].uri);
      }
    } catch (error: any) {
      Alert.alert('Lỗi', error?.message || 'Không thể mở thư viện ảnh');
    }
  };

  const handleChangeAvatar = async () => {
    const nextAvatar = avatarUrl.trim();
    if (!nextAvatar) {
      Alert.alert('Lỗi', 'Vui lòng nhập URL ảnh');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const isHttpUrl = /^https?:\/\//i.test(nextAvatar);
      const isLocalFileUri = /^(file|content):\/\//i.test(nextAvatar);

      if (isLocalFileUri) {
        await updateUser({ avatarFile: { uri: nextAvatar } });
      } else if (isHttpUrl) {
        await updateUser({ avatar: nextAvatar });
      } else {
        Alert.alert('Lỗi', 'URL ảnh không hợp lệ');
        return;
      }
      setAvatarModalVisible(false);
      setAvatarUrl('');
      Alert.alert('Thành công ✅', 'Ảnh đại diện đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật ảnh thất bại');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ==================== LOGOUT ====================
  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => { await logout(); },
        },
      ]
    );
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'teacher': return 'Giảng viên';
      case 'admin': return 'Quản trị viên';
      default: return 'Sinh viên';
    }
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'teacher': return '#F59E0B';
      case 'admin': return '#EF4444';
      default: return colors.tint;
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
      </View>
    );
  }

  const roleColor = getRoleColor(user.role);

  // ==================== MENU ITEM COMPONENT ====================
  const MenuItem = ({
    icon,
    ionIcon,
    title,
    subtitle,
    onPress,
    color = colors.text,
    showChevron = true,
  }: {
    icon?: string;
    ionIcon?: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    color?: string;
    showChevron?: boolean;
  }) => (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.menuIcon, { backgroundColor: color + '15' }]}>
        {ionIcon ? (
          <Ionicons name={ionIcon} size={20} color={color} />
        ) : (
          <FontAwesome name={icon as any} size={18} color={color} />
        )}
      </View>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Text style={[styles.menuText, { color }]}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {showChevron && <FontAwesome name="chevron-right" size={14} color={colors.muted} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
    >
      {/* ==================== PROFILE HEADER ==================== */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        {/* Gradient-like decorative bar */}
        <View style={{ height: 100, backgroundColor: roleColor, opacity: 0.1, position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }} />

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            style={styles.avatar}
            source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366F1&color=fff&size=200&bold=true` }}
          />
          <View style={[styles.avatarBadge, { backgroundColor: colors.tint }]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Name & Info */}
        <Text style={[styles.profileName, { color: colors.text }]}>{user.fullName}</Text>
        <Text style={[styles.profileEmail, { color: colors.muted }]}>{user.email}</Text>

        {/* Role Badge */}
        <View style={[styles.roleBadge, { backgroundColor: roleColor + '15', borderColor: roleColor + '30' }]}>
          <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
          <Text style={[styles.roleText, { color: roleColor }]}>{getRoleLabel(user.role)}</Text>
        </View>

        {/* Verified Badge */}
        {user.isEmailVerified && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'transparent' }}>
            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
            <Text style={{ fontSize: 12, color: '#10B981', fontWeight: '600', marginLeft: 4 }}>Email đã xác thực</Text>
          </View>
        )}
      </View>

      {/* ==================== PROFILE DETAILS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin cá nhân</Text>

        <ProfileRow
          icon="person-outline"
          label="Họ tên"
          value={user.fullName}
          colors={colors}
        />
        <ProfileRow
          icon="mail-outline"
          label="Email"
          value={user.email}
          colors={colors}
        />
        <ProfileRow
          icon="call-outline"
          label="Số điện thoại"
          value={user.phoneNumber || 'Chưa cập nhật'}
          colors={colors}
          muted={!user.phoneNumber}
        />
        <ProfileRow
          icon="calendar-outline"
          label="Ngày sinh"
          value={user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString('vi-VN') : 'Chưa cập nhật'}
          colors={colors}
          muted={!user.dateOfBirth}
        />
        <ProfileRow
          icon="business-outline"
          label="Khoa/Bộ môn"
          value={user.department || 'Chưa cập nhật'}
          colors={colors}
          muted={!user.department}
        />
        {user.studentId && (
          <ProfileRow
            icon="id-card-outline"
            label="Mã sinh viên"
            value={user.studentId}
            colors={colors}
          />
        )}
        <ProfileRow
          icon="document-text-outline"
          label="Giới thiệu"
          value={user.bio || 'Chưa có giới thiệu'}
          colors={colors}
          muted={!user.bio}
        />
      </View>

      {/* ==================== ACCOUNT SETTINGS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tài khoản</Text>

        <MenuItem
          ionIcon="create-outline"
          title="Chỉnh sửa hồ sơ"
          subtitle="Cập nhật thông tin cá nhân"
          onPress={() => setEditModalVisible(true)}
          color="#6366F1"
        />
        <MenuItem
          ionIcon="image-outline"
          title="Đổi ảnh đại diện"
          subtitle="Thay đổi hình ảnh tài khoản"
          onPress={() => setAvatarModalVisible(true)}
          color="#F59E0B"
        />
        <MenuItem
          ionIcon="lock-closed-outline"
          title="Đổi mật khẩu"
          subtitle="Cập nhật mật khẩu tài khoản"
          onPress={() => setPasswordModalVisible(true)}
          color="#10B981"
        />
      </View>

      {/* ==================== OTHER SETTINGS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Khác</Text>

        <MenuItem
          ionIcon="notifications-outline"
          title="Thông báo"
          color={colors.text}
        />
        <MenuItem
          ionIcon="shield-outline"
          title="Quyền riêng tư"
          color={colors.text}
        />
        <MenuItem
          ionIcon="information-circle-outline"
          title="Về ứng dụng"
          subtitle="Phiên bản 1.0.0"
          color={colors.text}
        />
      </View>

      {/* ==================== LOGOUT ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface, marginBottom: 40 }]}>
        <MenuItem
          ionIcon="log-out-outline"
          title="Đăng xuất"
          onPress={handleLogout}
          color={colors.error}
          showChevron={false}
        />
      </View>

      {/* ==================== EDIT PROFILE MODAL ==================== */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={handleSaveProfile} disabled={isUpdating}>
              {isUpdating ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={{ color: colors.tint, fontSize: 16, fontWeight: '700' }}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <ModalInput
              label="Họ và tên *"
              value={editFields.fullName}
              onChangeText={(v: string) => setEditFields({ ...editFields, fullName: v })}
              placeholder="Nhập họ và tên"
              colors={colors}
            />
            <ModalInput
              label="Số điện thoại"
              value={editFields.phoneNumber}
              onChangeText={(v: string) => setEditFields({ ...editFields, phoneNumber: v })}
              placeholder="0901234567"
              keyboardType="phone-pad"
              colors={colors}
            />
            <ModalInput
              label="Ngày sinh (YYYY-MM-DD)"
              value={editFields.dateOfBirth}
              onChangeText={(v: string) => setEditFields({ ...editFields, dateOfBirth: v })}
              placeholder="2000-01-15"
              colors={colors}
            />
            <ModalInput
              label="Khoa / Bộ môn"
              value={editFields.department}
              onChangeText={(v: string) => setEditFields({ ...editFields, department: v })}
              placeholder="Khoa Công nghệ Thông tin"
              colors={colors}
            />
            <ModalInput
              label="Giới thiệu bản thân"
              value={editFields.bio}
              onChangeText={(v: string) => setEditFields({ ...editFields, bio: v })}
              placeholder="Viết vài dòng về bạn..."
              multiline
              colors={colors}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================== CHANGE PASSWORD MODAL ==================== */}
      <Modal
        visible={passwordModalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setPasswordModalVisible(false); setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword(''); }}>
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đổi mật khẩu</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={{ padding: 20 }}>
            {/* Lock icon */}
            <View style={{ alignItems: 'center', marginBottom: 28 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="key" size={32} color="#10B981" />
              </View>
            </View>

            {/* Current Password */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Mật khẩu hiện tại</Text>
            <View style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#374151' : '#F8FAFC' }]}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
              <TextInput
                placeholder="Nhập mật khẩu hiện tại"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showCurrentPw}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={[styles.passwordTextInput, { color: colors.text }]}
              />
              <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)}>
                <Ionicons name={showCurrentPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Mật khẩu mới</Text>
            <View style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#374151' : '#F8FAFC' }]}>
              <Ionicons name="lock-open-outline" size={20} color={colors.muted} />
              <TextInput
                placeholder="Ít nhất 6 ký tự"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showNewPw}
                value={newPassword}
                onChangeText={setNewPassword}
                style={[styles.passwordTextInput, { color: colors.text }]}
              />
              <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)}>
                <Ionicons name={showNewPw ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Password Strength */}
            {newPassword.length > 0 && (
              <View style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 4, marginBottom: 4 }}>
                  {[1, 2, 3, 4].map((level) => (
                    <View
                      key={level}
                      style={{
                        flex: 1, height: 3, borderRadius: 2,
                        backgroundColor: newPassword.length >= level * 3
                          ? level <= 1 ? '#EF4444' : level <= 2 ? '#F59E0B' : level <= 3 ? '#3B82F6' : '#10B981'
                          : '#E2E8F0',
                      }}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Confirm New Password */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Xác nhận mật khẩu mới</Text>
            <View style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#374151' : '#F8FAFC' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.muted} />
              <TextInput
                placeholder="Nhập lại mật khẩu mới"
                placeholderTextColor={colors.muted}
                secureTextEntry={!showNewPw}
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                style={[styles.passwordTextInput, { color: colors.text }]}
              />
            </View>

            {/* Mismatch warning */}
            {confirmNewPassword.length > 0 && newPassword !== confirmNewPassword && (
              <Text style={{ color: '#EF4444', fontSize: 13, marginTop: -8, marginBottom: 16 }}>
                ⚠️ Mật khẩu không khớp
              </Text>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleChangePassword}
              disabled={isChangingPassword}
              activeOpacity={0.8}
              style={{
                backgroundColor: isChangingPassword ? '#6EE7B7' : '#10B981',
                borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                flexDirection: 'row', justifyContent: 'center', marginTop: 12,
                shadowColor: '#10B981', shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
              }}
            >
              {isChangingPassword ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Cập nhật mật khẩu</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ==================== CHANGE AVATAR MODAL ==================== */}
      <Modal
        visible={avatarModalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1, backgroundColor: colors.background }}
        >
          {/* Modal Header */}
          <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => { setAvatarModalVisible(false); setAvatarUrl(''); }}>
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đổi ảnh đại diện</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView style={{ padding: 20 }} contentContainerStyle={{ alignItems: 'center' }}>
            {/* Current Avatar Preview */}
            <View style={{ marginBottom: 28, alignItems: 'center' }}>
              <Image
                style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: colors.tint + '30' }}
                source={{ uri: avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366F1&color=fff&size=200&bold=true` }}
              />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Xem trước ảnh đại diện</Text>
            </View>

            {/* URL Input */}
            <View style={{ width: '100%' }}>
              <TouchableOpacity
                onPress={handlePickAvatarFromLibrary}
                activeOpacity={0.8}
                style={{
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colorScheme === 'dark' ? '#374151' : '#F8FAFC',
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  marginBottom: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Ionicons name="images-outline" size={20} color={colors.tint} />
                <Text style={{ color: colors.text, fontWeight: '600' }}>Chọn ảnh từ thư viện</Text>
              </TouchableOpacity>

              <Text style={{ color: colors.muted, fontSize: 12, marginBottom: 10 }}>
                Hoặc dán URL ảnh bên dưới:
              </Text>
              <Text style={[styles.inputLabel, { color: colors.text }]}>URL hình ảnh</Text>
              <View style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colorScheme === 'dark' ? '#374151' : '#F8FAFC' }]}>
                <Ionicons name="link-outline" size={20} color={colors.muted} />
                <TextInput
                  placeholder="https://example.com/avatar.jpg"
                  placeholderTextColor={colors.muted}
                  value={avatarUrl}
                  onChangeText={setAvatarUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                  style={[styles.passwordTextInput, { color: colors.text }]}
                />
              </View>

              {/* Quick Avatars */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>Hoặc chọn avatar mẫu:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' }}>
                {[
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366F1&color=fff&size=200&bold=true`,
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=EF4444&color=fff&size=200&bold=true`,
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=10B981&color=fff&size=200&bold=true`,
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=F59E0B&color=fff&size=200&bold=true`,
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=EC4899&color=fff&size=200&bold=true`,
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=8B5CF6&color=fff&size=200&bold=true`,
                ].map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setAvatarUrl(url)}
                    style={{
                      borderWidth: 3,
                      borderColor: avatarUrl === url ? colors.tint : 'transparent',
                      borderRadius: 32,
                      padding: 2,
                    }}
                  >
                    <Image source={{ uri: url }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleChangeAvatar}
                disabled={isUploadingAvatar}
                activeOpacity={0.8}
                style={{
                  backgroundColor: isUploadingAvatar ? '#FCD34D' : '#F59E0B',
                  borderRadius: 16, paddingVertical: 16, alignItems: 'center',
                  flexDirection: 'row', justifyContent: 'center', marginTop: 28,
                  shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
                }}
              >
                {isUploadingAvatar ? <ActivityIndicator color="white" style={{ marginRight: 8 }} /> : null}
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Cập nhật ảnh đại diện</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}

// ==================== SUB COMPONENTS ====================

function ProfileRow({
  icon,
  label,
  value,
  colors,
  muted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  muted?: boolean;
}) {
  return (
    <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.profileRowIcon, { backgroundColor: colors.tint + '10' }]}>
        <Ionicons name={icon} size={18} color={colors.tint} />
      </View>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500', marginBottom: 2 }}>{label}</Text>
        <Text style={{ fontSize: 15, color: muted ? colors.muted : colors.text, fontWeight: '500', fontStyle: muted ? 'italic' : 'normal' }}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ModalInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'url';
  multiline?: boolean;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.inputLabel, { color: colors.text }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.modalTextInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
            minHeight: multiline ? 100 : 48,
          },
        ]}
      />
    </View>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  profileName: { fontSize: 24, fontWeight: '800', marginBottom: 4 },
  profileEmail: { fontSize: 14, marginBottom: 12 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1,
  },
  roleDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  roleText: { fontSize: 13, fontWeight: '700' },

  // Sections
  sectionContainer: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Profile Row
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  profileRowIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },

  // Menu Item
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth,
    backgroundColor: 'transparent',
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { fontSize: 16, fontWeight: '600' },

  // Modal
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalTextInput: {
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15,
  },

  // Input Label
  inputLabel: {
    fontSize: 14, fontWeight: '600',
    marginBottom: 8, marginLeft: 2,
  },

  // Password Input
  passwordInput: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 14,
    marginBottom: 20, backgroundColor: 'transparent',
  },
  passwordTextInput: {
    flex: 1, marginLeft: 10, fontSize: 15,
  },
});



import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
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
  Switch,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth';
import { changePassword, logoutAll, resendVerificationEmail } from '@/utils/authService';
import { uploadImageToCloudinary } from '@/utils/mediaService';
import { deleteMyAccount } from '@/utils/userService';
import { getMySettings, updateMySettings, type UserSettings, type ThemeMode } from '@/utils/settingsService';
import { useRouter } from 'expo-router';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ChangeAvatarModal from '@/components/profile/ChangeAvatarModal';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type EditableFields = {
  username: string;
  phone: string;
  email: string;
  avatarUrl: string;
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const { user, logout, updateUser, refreshUser } = useAuth();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Edit Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Edit Profile fields (moved to EditProfileModal)


  // Avatar URL input
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isResendingVerify, setIsResendingVerify] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    // Other simple syncing logic if needed
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const load = async () => {
        if (!user?.id) return; // Prevent fetching if logged out
        try {
          if (!settings) setIsLoadingSettings(true);
          await Promise.all([
            refreshUser(),
            getMySettings().then((s) => {
              if (isActive) setSettings(s);
            }),
          ]);
        } catch (e: any) {
          console.log('Failed to load profile settings:', e.message);
        } finally {
          if (isActive) setIsLoadingSettings(false);
        }
      };
      load();
      return () => {
        isActive = false;
      };
    }, [refreshUser, user?.id])
  );

  const onRefresh = useCallback(async () => {
    if (!user?.id) return; // Prevent fetching if logged out
    setRefreshing(true);
    await Promise.all([
      refreshUser(),
      getMySettings().then(setSettings).catch((error: any) => console.log('Failed to refresh settings:', error.message)),
    ]);
    setRefreshing(false);
  }, [refreshUser, user?.id]);

  const handleUpdateTheme = async (theme: ThemeMode) => {
    if (!settings || isSavingSettings) return;
    if (settings.theme === theme) return; // no change
    const previous = settings;
    const next = { ...settings, theme };
    setSettings(next); // optimistic update
    setIsSavingSettings(true);
    try {
      await updateMySettings({ theme });
      // Theme changes silently - the color scheme hook reacts immediately
    } catch (error: any) {
      setSettings(previous); // rollback on error
      Alert.alert('Lỗi', error.message || 'Không thể lưu cài đặt giao diện');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleNotification = async (
    key: keyof UserSettings['notifications'],
    value: boolean,
  ) => {
    if (!settings || isSavingSettings) return;
    const previous = settings;
    const notifications = { ...settings.notifications, [key]: value };
    setSettings({ ...settings, notifications });
    setIsSavingSettings(true);
    try {
      await updateMySettings({ notifications });
    } catch (error: any) {
      setSettings(previous);
      Alert.alert('Lỗi', error.message || 'Không thể lưu cài đặt thông báo');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const requireEmailVerification = useCallback(() => {
    if (user?.email && !user?.isEmailVerified) {
      Alert.alert(
        'Xác thực email',
        'Bạn cần xác thực email trước khi cập nhật hồ sơ.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Xác thực ngay', onPress: () => router.push('/(auth)/verify-email' as any) },
        ],
      );
      return true;
    }
    return false;
  }, [user?.email, user?.isEmailVerified, router]);

  // ==================== CHANGE AVATAR ====================
  const handleChangeAvatar = async () => {
    const nextAvatar = avatarUrl.trim();
    if (!nextAvatar) {
      Alert.alert('Lỗi', 'Vui lòng nhập URL ảnh');
      return;
    }
    if (!/^https?:\/\//i.test(nextAvatar)) {
      Alert.alert('Lỗi', 'URL ảnh phải bắt đầu bằng http:// hoặc https://');
      return;
    }
    setIsUploadingAvatar(true);
    try {
      await updateUser({ avatarUrl: nextAvatar });
      setAvatarModalVisible(false);
      setAvatarUrl('');
      Alert.alert('Thành công ✅', 'Ảnh đại diện đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật ảnh thất bại');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handlePickAvatarFromLibrary = async () => {
    if (requireEmailVerification()) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Lỗi', 'Bạn cần cấp quyền truy cập thư viện ảnh');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.length) return;

    setIsUploadingAvatar(true);
    try {
      const localUri = result.assets[0].uri;
      const uploadedUrl = await uploadImageToCloudinary(localUri);
      await updateUser({ avatarUrl: uploadedUrl });
      setAvatarUrl(uploadedUrl);
      Alert.alert('Thành công', 'Đã cập nhật ảnh đại diện từ Cloudinary');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải ảnh lên Cloudinary');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleResendVerifyEmail = async () => {
    if (!user?.email || user?.isEmailVerified) return;
    setIsResendingVerify(true);
    try {
      await resendVerificationEmail(user.email);
      Alert.alert('Thành công', 'Đã gửi lại OTP xác thực email');
      router.push('/(auth)/verify-email' as any);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể gửi lại OTP');
    } finally {
      setIsResendingVerify(false);
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
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Thành công ✅', 'Mật khẩu đã được đổi!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đổi mật khẩu thất bại');
    } finally {
      setIsChangingPassword(false);
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
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const handleLogoutAll = () => {
    Alert.alert(
      'Đăng xuất mọi thiết bị',
      'Bạn có chắc chắn muốn đăng xuất trên tất cả thiết bị?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất tất cả',
          style: 'destructive',
          onPress: async () => {
            await logoutAll();
            await logout();
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    if (!user?.id) return;
    Alert.alert(
      'Xóa tài khoản',
      'Tài khoản sẽ bị vô hiệu hóa (soft delete). Bạn có chắc chắn muốn tiếp tục?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeletingAccount(true);
              await deleteMyAccount(user.id);
              await logout();
              Alert.alert('Thành công', 'Tài khoản đã được xóa');
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể xóa tài khoản');
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
      </View>
    );
  }


  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
    >
      {/* ==================== PROFILE HEADER ==================== */}
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        {/* Decorative bar */}
        <View style={{ height: 100, backgroundColor: colors.tint, opacity: 0.1, position: 'absolute', top: 0, left: 0, right: 0 }} />

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            style={styles.avatar}
            source={{ uri: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366F1&color=fff&size=200&bold=true` }}
          />
          <View style={[styles.avatarBadge, { backgroundColor: colors.tint }]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Name & Info */}
        <Text style={[styles.profileName, { color: colors.text }]}>{user.username}</Text>
        <Text style={[styles.profileEmail, { color: colors.muted }]}>{user.email}</Text>

        {/* Online Status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'transparent' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: user.isOnline ? '#10B981' : '#94A3B8', marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: user.isOnline ? '#10B981' : '#94A3B8', fontWeight: '600' }}>
            {user.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </Text>
        </View>
      </View>

      {/* ==================== PROFILE DETAILS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin cá nhân</Text>

        <ProfileRow icon="person-outline" label="Username" value={user.username} colors={colors} />
        <TouchableOpacity
          onPress={() => {
            if (user.email && !user.isEmailVerified) {
              handleResendVerifyEmail();
            }
          }}
          disabled={!user.email || user.isEmailVerified}
          activeOpacity={user.email && !user.isEmailVerified ? 0.6 : 1}
        >
          <View style={[styles.profileRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.profileRowIcon, { backgroundColor: colors.tint + '10' }]}>
              <Ionicons name="mail-outline" size={18} color={colors.tint} />
            </View>
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '500', marginBottom: 2 }}>Email</Text>
              <Text style={{ fontSize: 15, color: user.email ? colors.text : colors.muted, fontWeight: '500', fontStyle: user.email ? 'normal' : 'italic' }}>
                {user.email || 'Chưa cập nhật'}
              </Text>
            </View>
            {user.email && (
              user.isEmailVerified ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Ionicons name="checkmark-circle" size={14} color="#166534" />
                  <Text style={{ color: '#166534', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Đã xác thực</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Ionicons name="warning" size={14} color="#92400E" />
                  <Text style={{ color: '#92400E', fontSize: 11, fontWeight: '700', marginLeft: 4 }}>Bấm xác thực</Text>
                </View>
              )
            )}
          </View>
        </TouchableOpacity>
        <ProfileRow
          icon="call-outline"
          label="Số điện thoại"
          value={user.phone || 'Chưa cập nhật'}
          colors={colors}
          muted={!user.phone}
        />
        <ProfileRow
          icon="people-outline"
          label="Bạn bè"
          value={`${user.friends?.length || 0} bạn bè`}
          colors={colors}
          onPress={() => router.push('/friend-list' as any)}
        />
        <ProfileRow
          icon="time-outline"
          label="Ngày tạo tài khoản"
          value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : 'Không rõ'}
          colors={colors}
        />
      </View>

      {!!user.email && !user.isEmailVerified && (
        <View style={[styles.sectionContainer, { backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 10 }}>
            <Ionicons name="warning-outline" size={20} color="#C2410C" />
            <View style={{ flex: 1, backgroundColor: 'transparent' }}>
              <Text style={{ color: '#9A3412', fontWeight: '700' }}>Email chưa xác thực</Text>
              <Text style={{ color: '#C2410C', fontSize: 12, marginTop: 2 }}>
                Bạn cần xác thực email để dùng đầy đủ tính năng tài khoản.
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleResendVerifyEmail}
              disabled={isResendingVerify}
              style={{ backgroundColor: '#EA580C', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}
            >
              {isResendingVerify ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ==================== ACCOUNT SETTINGS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tài khoản</Text>

        <MenuItem
          ionIcon="create-outline"
          title="Chỉnh sửa hồ sơ"
          subtitle="Cập nhật username và số điện thoại"
          onPress={() => setEditModalVisible(true)}
          color="#6366F1"
          colors={colors}
        />
        <MenuItem
          ionIcon="lock-closed-outline"
          title="Đổi mật khẩu"
          subtitle="Cập nhật mật khẩu an toàn"
          onPress={() => setPasswordModalVisible(true)}
          color="#10B981"
          colors={colors}
        />
        <MenuItem
          ionIcon="image-outline"
          title="Đổi ảnh đại diện"
          subtitle="Thay đổi hình ảnh tài khoản"
          onPress={() => setAvatarModalVisible(true)}
          color="#F59E0B"
          colors={colors}
        />
        <MenuItem
          ionIcon="folder-open-outline"
          title="Media Manager"
          subtitle="Tra cứu và xóa media theo ID"
          onPress={() => router.push('/media-manager' as any)}
          color="#0EA5E9"
          colors={colors}
        />
        <MenuItem
          ionIcon="archive-outline"
          title="Tin nhắn lưu trữ"
          subtitle="Xem các cuộc trò chuyện đã ẩn"
          onPress={() => router.push('/archived-conversations' as any)}
          color="#8B5CF6"
          colors={colors}
        />
        <MenuItem
          ionIcon="ban-outline"
          title="Danh sách chặn"
          subtitle="Quản lý người dùng đã chặn"
          onPress={() => router.push('/blocked-users' as any)}
          color="#EF4444"
          colors={colors}
        />
      </View>

      {/* ==================== OTHER SETTINGS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Khác</Text>

        <View style={[styles.preferenceWrap, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Text style={[styles.menuText, { color: colors.text }]}>Giao diện (Theme)</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              Hiện tại: {settings?.theme === 'light' ? '☀️ Sáng' : settings?.theme === 'dark' ? '🌙 Tối' : '📱 Hệ thống'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 6, backgroundColor: 'transparent' }}>
            {([
              { mode: 'light', label: 'Sáng', icon: 'sunny' },
              { mode: 'dark', label: 'Tối', icon: 'moon' },
              { mode: 'system', label: 'Auto', icon: 'phone-portrait' },
            ] as { mode: ThemeMode; label: string; icon: any }[]).map(({ mode, label, icon }) => {
              const active = settings?.theme === mode;
              return (
                <TouchableOpacity
                  key={mode}
                  onPress={() => handleUpdateTheme(mode)}
                  disabled={isLoadingSettings || isSavingSettings}
                  style={[
                    styles.themeChip,
                    {
                      borderColor: active ? colors.tint : colors.border,
                      backgroundColor: active ? colors.tint : 'transparent',
                    },
                  ]}
                >
                  <Ionicons name={icon} size={13} color={active ? '#fff' : colors.muted} />
                  <Text style={{ color: active ? '#fff' : colors.muted, fontWeight: '700', fontSize: 11, marginTop: 2 }}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <PreferenceSwitchRow
          label="Thông báo đẩy"
          subtitle="Bật/tắt toàn bộ push notification"
          value={!!settings?.notifications?.pushEnabled}
          colors={colors}
          disabled={isLoadingSettings || isSavingSettings}
          onValueChange={(v) => handleToggleNotification('pushEnabled', v)}
        />
        <PreferenceSwitchRow
          label="Thông báo tin nhắn"
          subtitle="Nhận thông báo cho chat cá nhân"
          value={!!settings?.notifications?.messageEnabled}
          colors={colors}
          disabled={isLoadingSettings || isSavingSettings}
          onValueChange={(v) => handleToggleNotification('messageEnabled', v)}
        />
        <PreferenceSwitchRow
          label="Thông báo nhóm"
          subtitle="Nhận thông báo trong nhóm chat"
          value={!!settings?.notifications?.groupEnabled}
          colors={colors}
          disabled={isLoadingSettings || isSavingSettings}
          onValueChange={(v) => handleToggleNotification('groupEnabled', v)}
        />
        <PreferenceSwitchRow
          label="Âm thanh thông báo"
          subtitle="Phát âm khi có thông báo mới"
          value={!!settings?.notifications?.soundEnabled}
          colors={colors}
          disabled={isLoadingSettings || isSavingSettings}
          onValueChange={(v) => handleToggleNotification('soundEnabled', v)}
        />

        <MenuItem
          ionIcon="notifications-outline"
          title="Thông báo"
          subtitle="Xem và đánh dấu đã đọc"
          onPress={() => router.push('/notifications' as any)}
          color={colors.text}
          colors={colors}
        />
        <MenuItem
          ionIcon="information-circle-outline"
          title="Về ứng dụng"
          subtitle="Phiên bản 1.0.0"
          onPress={() =>
            Alert.alert(
              'Về ứng dụng',
              'Zalo Edu Mobile\nPhiên bản 1.0.0',
            )
          }
          color={colors.text}
          colors={colors}
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
          colors={colors}
        />
        <MenuItem
          ionIcon="log-out"
          title="Đăng xuất tất cả thiết bị"
          onPress={handleLogoutAll}
          color="#B91C1C"
          showChevron={false}
          colors={colors}
        />
        <MenuItem
          ionIcon="trash-outline"
          title={isDeletingAccount ? 'Đang xóa tài khoản...' : 'Xóa tài khoản'}
          subtitle="Thao tác này sẽ đăng xuất và vô hiệu hóa tài khoản"
          onPress={isDeletingAccount ? undefined : handleDeleteAccount}
          color="#DC2626"
          showChevron={false}
          colors={colors}
        />
      </View>

      {/* ==================== EDIT PROFILE MODAL ==================== */}
      <EditProfileModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        user={user}
        updateUser={updateUser}
        colors={colors}
      />


      {/* ==================== CHANGE AVATAR MODAL ==================== */}
      <ChangeAvatarModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        colors={colors}
        colorScheme={colorScheme as 'light' | 'dark'}
        user={user}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        handlePickAvatarFromLibrary={handlePickAvatarFromLibrary}
        handleChangeAvatar={handleChangeAvatar}
        isUploadingAvatar={isUploadingAvatar}
      />

      {/* ==================== CHANGE PASSWORD MODAL ==================== */}
      <ChangePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        colors={colors}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        isChangingPassword={isChangingPassword}
        handleChangePassword={handleChangePassword}
      />
    </ScrollView>
  );
}

// ==================== SUB COMPONENTS ====================

function MenuItem({
  ionIcon,
  title,
  subtitle,
  onPress,
  color,
  showChevron = true,
  colors,
}: {
  ionIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  color?: string;
  showChevron?: boolean;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, { borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.menuIcon, { backgroundColor: (color || colors.text) + '15' }]}>
        {ionIcon && <Ionicons name={ionIcon} size={20} color={color || colors.text} />}
      </View>
      <View style={{ flex: 1, backgroundColor: 'transparent' }}>
        <Text style={[styles.menuText, { color: color || colors.text }]}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      {showChevron && <FontAwesome name="chevron-right" size={14} color={colors.muted} />}
    </TouchableOpacity>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  colors,
  muted = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  colors: any;
  muted?: boolean;
  onPress?: () => void;
}) {
  const content = (
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
      {onPress && <FontAwesome name="chevron-right" size={12} color={colors.muted} />}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.6}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

function PreferenceSwitchRow({
  label,
  subtitle,
  value,
  onValueChange,
  colors,
  disabled = false,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  colors: any;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.preferenceWrap, { borderBottomColor: colors.border }]}>
      <View style={{ flex: 1, backgroundColor: 'transparent', paddingRight: 12 }}>
        <Text style={[styles.menuText, { color: colors.text }]}>{label}</Text>
        {subtitle ? <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#CBD5E1', true: colors.tint }}
        thumbColor={value ? '#FFFFFF' : '#F1F5F9'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  profileHeader: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  avatarContainer: { position: 'relative', marginTop: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff' },
  avatarBadge: {
    position: 'absolute', bottom: 4, right: 4,
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  profileName: { fontSize: 26, fontWeight: '800', marginTop: 16 },
  profileEmail: { fontSize: 14, marginTop: 4 },

  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { fontSize: 15, fontWeight: '600' },
  preferenceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  themeChip: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
    minWidth: 48,
  },

  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  profileRowIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },

  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },

  passwordInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
  },
  passwordTextInput: { flex: 1, fontSize: 15 },
});

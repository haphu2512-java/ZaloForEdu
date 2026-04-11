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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
=======
  Switch,
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
} from 'react-native';
import { Text, View } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
import { useAuth } from '@/context/auth';
import * as authService from '@/utils/authService';
import * as ImagePicker from 'expo-image-picker';
=======
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/context/auth';
import { changePassword, logoutAll, resendVerificationEmail } from '@/utils/authService';
import { uploadImageToCloudinary } from '@/utils/mediaService';
import { deleteMyAccount } from '@/utils/userService';
import { getMySettings, updateMySettings, type UserSettings, type ThemeMode } from '@/utils/settingsService';
import { useRouter } from 'expo-router';
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type EditableFields = {
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
  fullName: string;
  phoneNumber: string;
  bio: string;
  department: string;
  dateOfBirth: string;
=======
  username: string;
  phone: string;
  email: string;
  avatarUrl: string;
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
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

  // Edit Profile fields
  const [editFields, setEditFields] = useState<EditableFields>({
    username: '',
    phone: '',
    email: '',
    avatarUrl: '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Avatar URL input
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isResendingVerify, setIsResendingVerify] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx

  useEffect(() => {
    if (user) {
      setEditFields({
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
        fullName: user.fullName || '',
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        department: user.department || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
=======
        username: user.username || '',
        phone: user.phone || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
      });
    }
  }, [user]);

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoadingSettings(true);
      try {
        const data = await getMySettings();
        setSettings(data);
      } catch (error: any) {
        console.log('Failed to load settings:', error.message);
      } finally {
        setIsLoadingSettings(false);
      }
    };
    void loadSettings();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      refreshUser(),
      getMySettings()
        .then(setSettings)
        .catch((error: any) => console.log('Failed to refresh settings:', error.message)),
    ]);
    setRefreshing(false);
  }, [refreshUser]);

  const handleUpdateTheme = async (theme: ThemeMode) => {
    if (!settings || isSavingSettings) return;
    const previous = settings;
    const next = { ...settings, theme };
    setSettings(next);
    setIsSavingSettings(true);
    try {
      await updateMySettings({ theme });
      Alert.alert('Thành công', 'Đã lưu cài đặt giao diện');
    } catch (error: any) {
      setSettings(previous);
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

  // ==================== EDIT PROFILE ====================
  const handleSaveProfile = async () => {
    const nextUsername = editFields.username.trim();
    const nextPhone = editFields.phone.trim();
    const nextEmail = editFields.email.trim().toLowerCase();

    if (!nextUsername || nextUsername.length < 3) {
      Alert.alert('Lỗi', 'Username phải có ít nhất 3 ký tự');
      return;
    }

    if (nextEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      Alert.alert('Lỗi', 'Email không đúng định dạng');
      return;
    }

    if (nextPhone && !/^\d{8,20}$/.test(nextPhone)) {
      Alert.alert('Lỗi', 'Số điện thoại phải từ 8-20 chữ số');
      return;
    }

    const currentUsername = (user?.username || '').trim();
    const currentPhone = (user?.phone || '').trim();
    const currentEmail = (user?.email || '').trim().toLowerCase();

    if (
      nextUsername === currentUsername &&
      nextPhone === currentPhone &&
      nextEmail === currentEmail
    ) {
      Alert.alert('Thông báo', 'Không có thay đổi để cập nhật');
      return;
    }

    const payload: any = {};
    if (nextUsername !== currentUsername) payload.username = nextUsername;
    if (nextPhone !== currentPhone) payload.phone = nextPhone || null;
    if (nextEmail !== currentEmail) payload.email = nextEmail || null;

    if (payload.email) {
      Alert.alert(
        'Lưu ý',
        'Bạn đang thay đổi email. Sau khi cập nhật, hãy xác thực email mới để đảm bảo bảo mật.',
      );
    }

    setIsUpdating(true);
    try {
      await updateUser(payload);
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
      setEditModalVisible(false);
      Alert.alert('Thành công ✅', 'Hồ sơ đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật thất bại');
    } finally {
      setIsUpdating(false);
    }
  };

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
=======
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

>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordModalVisible(false);
      setCurrentPassword('');
      setNewPassword('');
      Alert.alert('Thành công ✅', 'Mật khẩu đã được đổi!');
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Đổi mật khẩu thất bại');
    } finally {
      setIsChangingPassword(false);
    }
  };

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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

=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
  };

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
        <Text style={{ marginTop: 12, color: colors.muted }}>Đang tải...</Text>
      </View>
    );
  }

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
  const roleColor = getRoleColor(user.role);

  // ==================== MENU ITEM COMPONENT ====================
  const MenuItem = ({
    icon,
=======
  // ==================== MENU ITEM COMPONENT ====================
  const MenuItem = ({
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
    ionIcon,
    title,
    subtitle,
    onPress,
    color = colors.text,
    showChevron = true,
  }: {
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
    icon?: string;
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
        {ionIcon ? (
          <Ionicons name={ionIcon} size={20} color={color} />
        ) : (
          <FontAwesome name={icon as any} size={18} color={color} />
        )}
=======
        {ionIcon && <Ionicons name={ionIcon} size={20} color={color} />}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
        {/* Gradient-like decorative bar */}
        <View style={{ height: 100, backgroundColor: roleColor, opacity: 0.1, position: 'absolute', top: 0, left: 0, right: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 }} />
=======
        {/* Decorative bar */}
        <View style={{ height: 100, backgroundColor: colors.tint, opacity: 0.1, position: 'absolute', top: 0, left: 0, right: 0 }} />
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx

        {/* Avatar */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => setAvatarModalVisible(true)}
          activeOpacity={0.8}
        >
          <Image
            style={styles.avatar}
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
            source={{ uri: user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366F1&color=fff&size=200&bold=true` }}
=======
            source={{ uri: user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366F1&color=fff&size=200&bold=true` }}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
          />
          <View style={[styles.avatarBadge, { backgroundColor: colors.tint }]}>
            <Ionicons name="camera" size={14} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* Name & Info */}
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
        <Text style={[styles.profileName, { color: colors.text }]}>{user.username}</Text>
        <Text style={[styles.profileEmail, { color: colors.muted }]}>{user.email}</Text>

        {/* Online Status */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, backgroundColor: 'transparent' }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: user.isOnline ? '#10B981' : '#94A3B8', marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: user.isOnline ? '#10B981' : '#94A3B8', fontWeight: '600' }}>
            {user.isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
          </Text>
        </View>
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
      </View>

      {/* ==================== PROFILE DETAILS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông tin cá nhân</Text>

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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

=======
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

>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
      {/* ==================== ACCOUNT SETTINGS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Tài khoản</Text>

        <MenuItem
          ionIcon="create-outline"
          title="Chỉnh sửa hồ sơ"
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
          subtitle="Cập nhật username và số điện thoại"
          onPress={() => {
            if (requireEmailVerification()) return;
            setEditModalVisible(true);
          }}
          color="#6366F1"
        />
        <MenuItem
          ionIcon="lock-closed-outline"
          title="Đổi mật khẩu"
          subtitle="Cập nhật mật khẩu an toàn"
          onPress={() => {
            if (requireEmailVerification()) return;
            setPasswordModalVisible(true);
          }}
          color="#10B981"
        />
        <MenuItem
          ionIcon="image-outline"
          title="Đổi ảnh đại diện"
          subtitle="Thay đổi hình ảnh tài khoản"
          onPress={() => {
            if (requireEmailVerification()) return;
            setAvatarModalVisible(true);
          }}
          color="#F59E0B"
        />
        <MenuItem
          ionIcon="folder-open-outline"
          title="Media Manager"
          subtitle="Tra cứu và xóa media theo ID"
          onPress={() => router.push('/media-manager' as any)}
          color="#0EA5E9"
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
        />
      </View>

      {/* ==================== OTHER SETTINGS ==================== */}
      <View style={[styles.sectionContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Khác</Text>

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
        <MenuItem
          ionIcon="notifications-outline"
          title="Thông báo"
          color={colors.text}
        />
        <MenuItem
          ionIcon="shield-outline"
          title="Quyền riêng tư"
=======
        <View style={[styles.preferenceWrap, { borderBottomColor: colors.border }]}>
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Text style={[styles.menuText, { color: colors.text }]}>Theme</Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>
              Chọn giao diện ứng dụng
            </Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, backgroundColor: 'transparent' }}>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => {
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
                      backgroundColor: active ? colors.tint + '20' : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ color: active ? colors.tint : colors.muted, fontWeight: '700', fontSize: 12 }}>
                    {mode === 'light' ? 'Sáng' : mode === 'dark' ? 'Tối' : 'System'}
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
          color={colors.text}
        />
        <MenuItem
          ionIcon="information-circle-outline"
          title="Về ứng dụng"
          subtitle="Phiên bản 1.0.0"
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
=======
          onPress={() =>
            Alert.alert(
              'Về ứng dụng',
              'Zalo Edu Mobile\nPhiên bản 1.0.0',
            )
          }
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
=======
        <MenuItem
          ionIcon="log-out"
          title="Đăng xuất tất cả thiết bị"
          onPress={handleLogoutAll}
          color="#B91C1C"
          showChevron={false}
        />
        <MenuItem
          ionIcon="trash-outline"
          title={isDeletingAccount ? 'Đang xóa tài khoản...' : 'Xóa tài khoản'}
          subtitle="Thao tác này sẽ đăng xuất và vô hiệu hóa tài khoản"
          onPress={isDeletingAccount ? undefined : handleDeleteAccount}
          color="#DC2626"
          showChevron={false}
        />
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
              label="Họ và tên *"
              value={editFields.fullName}
              onChangeText={(v: string) => setEditFields({ ...editFields, fullName: v })}
              placeholder="Nhập họ và tên"
=======
              label="Username *"
              value={editFields.username}
              onChangeText={(v: string) => setEditFields({ ...editFields, username: v })}
              placeholder="Nhập username (ít nhất 3 ký tự)"
              autoCapitalize="none"
              colors={colors}
            />
            <ModalInput
              label="Email"
              value={editFields.email}
              onChangeText={(v: string) => setEditFields({ ...editFields, email: v })}
              placeholder="Nhập email"
              keyboardType="email-address"
              autoCapitalize="none"
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
              colors={colors}
            />
            <ModalInput
              label="Số điện thoại"
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
              value={editFields.phoneNumber}
              onChangeText={(v: string) => setEditFields({ ...editFields, phoneNumber: v })}
=======
              value={editFields.phone}
              onChangeText={(v: string) => setEditFields({ ...editFields, phone: v })}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
              placeholder="0901234567"
              keyboardType="phone-pad"
              colors={colors}
            />
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
                source={{ uri: avatarUrl || user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&background=6366F1&color=fff&size=200&bold=true` }}
=======
                source={{ uri: avatarUrl || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=6366F1&color=fff&size=200&bold=true` }}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
              />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Xem trước ảnh đại diện</Text>
            </View>

            {/* URL Input */}
            <View style={{ width: '100%' }}>
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
              <TouchableOpacity
                onPress={handlePickAvatarFromLibrary}
                disabled={isUploadingAvatar}
                style={{
                  backgroundColor: '#0EA5E9',
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                {isUploadingAvatar ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Chọn ảnh từ thư viện (Cloudinary)</Text>
                )}
              </TouchableOpacity>

              {/* Quick Avatars */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>Hoặc chọn avatar mẫu:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' }}>
                {['6366F1', 'EF4444', '10B981', 'F59E0B', 'EC4899', '8B5CF6'].map((bg, idx) => {
                  const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=${bg}&color=fff&size=200&bold=true`;
                  return (
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
                  );
                })}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
=======

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
            <TouchableOpacity onPress={() => { setPasswordModalVisible(false); setCurrentPassword(''); setNewPassword(''); }}>
              <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Hủy</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Đổi mật khẩu</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={isChangingPassword}>
              {isChangingPassword ? (
                <ActivityIndicator size="small" color={colors.tint} />
              ) : (
                <Text style={{ color: colors.tint, fontSize: 16, fontWeight: '700' }}>Lưu</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ padding: 20 }}>
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Mật khẩu hiện tại</Text>
              <View style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.muted} />
                <TextInput
                  placeholder="Nhập mật khẩu cũ"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  style={[styles.passwordTextInput, { color: colors.text }]}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Mật khẩu mới</Text>
              <View style={[styles.passwordInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
                <Ionicons name="key-outline" size={20} color={colors.muted} />
                <TextInput
                  placeholder="Ít nhất 6 ký tự"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  style={[styles.passwordTextInput, { color: colors.text }]}
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
  multiline,
=======
  autoCapitalize,
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'url';
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
  multiline?: boolean;
=======
  autoCapitalize?: 'none' | 'sentences';
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
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
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        textAlignVertical={multiline ? 'top' : 'center'}
=======
        autoCapitalize={autoCapitalize}
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
        style={[
          styles.modalTextInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
            minHeight: multiline ? 100 : 48,
=======
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
          },
        ]}
      />
    </View>
  );
}

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
// ==================== STYLES ====================
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx

const styles = StyleSheet.create({
  container: { flex: 1 },

<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
=======
  profileHeader: {
    alignItems: 'center',
    paddingTop: 48,
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
    paddingBottom: 24,
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
  avatarContainer: { position: 'relative', marginBottom: 16 },
  avatar: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  avatarBadge: {
    position: 'absolute', bottom: 2, right: 2,
=======
  avatarContainer: { position: 'relative', marginTop: 20 },
  avatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 4, borderColor: '#fff' },
  avatarBadge: {
    position: 'absolute', bottom: 4, right: 4,
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx
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
=======
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 14,
  },
<<<<<<< HEAD:edu-ott-system/frontend/mobile-app/app/(tabs)/profile.tsx

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


=======
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
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
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
>>>>>>> Refactor_Project:edu-ott-system/frontend/mobile/app/(tabs)/profile.tsx

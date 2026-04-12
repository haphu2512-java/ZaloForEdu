import React, { useState, useEffect } from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';

type EditableFields = {
  username: string;
  phone: string;
  email: string;
  avatarUrl: string;
};

function ModalInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  colors,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'email-address' | 'url';
  autoCapitalize?: 'none' | 'sentences';
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
        autoCapitalize={autoCapitalize}
        style={[
          styles.modalTextInput,
          {
            color: colors.text,
            borderColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      />
    </View>
  );
}

export default function EditProfileModal({
  visible,
  onClose,
  user,
  updateUser,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  user: any;
  updateUser: (data: any) => Promise<void>;
  colors: any;
}) {
  const [editFields, setEditFields] = useState<EditableFields>({
    username: user?.username || '',
    phone: user?.phone || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || '',
  });
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setEditFields({
        username: user.username || '',
        phone: user.phone || '',
        email: user.email || '',
        avatarUrl: user.avatarUrl || '',
      });
    }
  }, [visible, user]);

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
      onClose();
      Alert.alert('Thành công ✅', 'Hồ sơ đã được cập nhật!');
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Cập nhật thất bại');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}>
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
            colors={colors}
          />
          <ModalInput
            label="Số điện thoại"
            value={editFields.phone}
            onChangeText={(v: string) => setEditFields({ ...editFields, phone: v })}
            placeholder="0901234567"
            keyboardType="phone-pad"
            colors={colors}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
});

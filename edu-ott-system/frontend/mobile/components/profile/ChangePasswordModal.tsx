import React from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ChangePasswordModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  currentPassword: string;
  setCurrentPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  isChangingPassword: boolean;
  handleChangePassword: () => void;
};

export default function ChangePasswordModal({
  visible,
  onClose,
  colors,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  showPassword,
  setShowPassword,
  isChangingPassword,
  handleChangePassword
}: ChangePasswordModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { onClose(); setCurrentPassword(''); setNewPassword(''); }}>
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
  );
}

const styles = StyleSheet.create({
  modalHeader: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
  passwordInput: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, gap: 10,
  },
  passwordTextInput: { flex: 1, fontSize: 16 },
});

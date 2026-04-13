import React from 'react';
import {
  Modal,
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
  StyleSheet
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { UserInfo } from '@/types/chat'; // Using chat types for UserInfo since app auth type is similar

type ChangeAvatarModalProps = {
  visible: boolean;
  onClose: () => void;
  colors: any;
  colorScheme: 'light' | 'dark';
  user: any;
  avatarUrl: string;
  setAvatarUrl: (url: string) => void;
  handlePickAvatarFromLibrary: () => void;
  handleChangeAvatar: () => void;
  isUploadingAvatar: boolean;
};

export default function ChangeAvatarModal({
  visible,
  onClose,
  colors,
  colorScheme,
  user,
  avatarUrl,
  setAvatarUrl,
  handlePickAvatarFromLibrary,
  handleChangeAvatar,
  isUploadingAvatar
}: ChangeAvatarModalProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={[styles.modalHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { onClose(); setAvatarUrl(''); }}>
            <Text style={{ color: colors.error, fontSize: 16, fontWeight: '600' }}>Hủy</Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Đổi ảnh đại diện</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ padding: 20 }} contentContainerStyle={{ alignItems: 'center' }}>
          <View style={{ marginBottom: 28, alignItems: 'center' }}>
            <Image
              style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: colors.tint + '30' }}
              source={{ uri: avatarUrl || user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=6366F1&color=fff&size=200&bold=true` }}
            />
            <Text style={{ color: colors.muted, marginTop: 12, fontSize: 14 }}>Xem trước ảnh đại diện</Text>
          </View>

          <View style={{ width: '100%' }}>
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

            <TouchableOpacity
              onPress={handlePickAvatarFromLibrary}
              disabled={isUploadingAvatar}
              style={{ backgroundColor: '#0EA5E9', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 12 }}
            >
              {isUploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={{ color: '#fff', fontWeight: '700' }}>Chọn ảnh từ thư viện (Cloudinary)</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 8 }]}>Hoặc chọn avatar mẫu:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8, justifyContent: 'center' }}>
              {['6366F1', 'EF4444', '10B981', 'F59E0B', 'EC4899', '8B5CF6'].map((bg, idx) => {
                const url = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&background=${bg}&color=fff&size=200&bold=true`;
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
            </View>

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

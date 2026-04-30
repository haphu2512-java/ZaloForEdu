import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useCommunityStore } from '@/stores/communityStore';
import { uploadImageToCloudinary } from '@/utils/mediaService';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

type Privacy = 'public' | 'private';
type JoinMode = 'open' | 'approval' | 'invite';

interface PrivacyOption {
  value: Privacy;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
}

interface JoinOption {
  value: JoinMode;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const PRIVACY_OPTIONS: PrivacyOption[] = [
  {
    value: 'public',
    label: 'Công khai',
    description: 'Ai cũng có thể tìm thấy và tham gia',
    icon: 'earth',
    color: '#059669',
    bg: '#D1FAE5',
  },
  {
    value: 'private',
    label: 'Riêng tư',
    description: 'Chỉ người được mời mới có thể tham gia',
    icon: 'lock-closed',
    color: '#D97706',
    bg: '#FEF3C7',
  },
];

const JOIN_OPTIONS: JoinOption[] = [
  { value: 'open', label: 'Mở', description: 'Tham gia ngay không cần phê duyệt', icon: 'enter' },
  { value: 'approval', label: 'Phê duyệt', description: 'Admin duyệt từng yêu cầu tham gia', icon: 'shield-checkmark' },
  { value: 'invite', label: 'Chỉ mời', description: 'Chỉ tham gia qua link mời của admin', icon: 'mail' },
];

export default function CreateCommunityScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { createCommunityItem } = useCommunityStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'Images' as any,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.length) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cộng đồng');
      return;
    }
    if (name.trim().length < 3) {
      Alert.alert('Tên quá ngắn', 'Tên cộng đồng phải có ít nhất 3 ký tự');
      return;
    }

    try {
      setLoading(true);

      let uploadedAvatarUrl: string | undefined;
      if (avatarUri) {
        try {
          uploadedAvatarUrl = await uploadImageToCloudinary(avatarUri);
        } catch {
          // avatar optional, ignore upload error
        }
      }

      const payload: any = {
        name: name.trim(),
        description: description.trim(),
        privacy,
        joinMode,
      };
      if (uploadedAvatarUrl) payload.avatarUrl = uploadedAvatarUrl;

      const created = await createCommunityItem(payload);
      router.replace({ pathname: '/community/[id]', params: { id: created._id } });
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tạo cộng đồng');
    } finally {
      setLoading(false);
    }
  };

  const brand = '#1D67FF';
  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} disabled={loading}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>Tạo cộng đồng</Text>
        <TouchableOpacity
          onPress={handleCreate}
          disabled={loading || !name.trim()}
          style={[s.doneBtn, { backgroundColor: name.trim() && !loading ? brand : '#D1D5DB' }]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.doneBtnText}>Tạo</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar Picker */}
          <View style={s.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} style={s.avatarWrap} activeOpacity={0.8}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatarImg} />
              ) : (
                <View style={[s.avatarPlaceholder, { backgroundColor: isDark ? '#1F2937' : '#EEF2FF' }]}>
                  <Ionicons name="people" size={44} color={brand} />
                </View>
              )}
              <View style={[s.avatarEditBadge, { backgroundColor: brand }]}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={[s.avatarHint, { color: colors.muted }]}>Chạm để chọn ảnh đại diện</Text>
          </View>

          {/* Community Name */}
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.fieldLabel, { color: colors.muted }]}>TÊN CỘNG ĐỒNG *</Text>
            <TextInput
              style={[s.nameInput, { color: colors.text }]}
              placeholder="Tên cộng đồng của bạn..."
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              maxLength={60}
              returnKeyType="next"
            />
            <View style={[s.divider, { backgroundColor: colors.border }]} />
            <Text style={[s.fieldLabel, { color: colors.muted, marginTop: 12 }]}>MÔ TẢ</Text>
            <TextInput
              style={[s.descInput, { color: colors.text }]}
              placeholder="Mô tả ngắn về cộng đồng (tùy chọn)..."
              placeholderTextColor={colors.muted}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={[s.counter, { color: colors.muted }]}>{description.length}/200</Text>
          </View>

          {/* Privacy */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Chế độ hiển thị</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 4 }]}>
            {PRIVACY_OPTIONS.map((opt, idx) => {
              const selected = privacy === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setPrivacy(opt.value)}
                  style={[
                    s.optionRow,
                    selected && { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' },
                    idx < PRIVACY_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[s.optionIcon, { backgroundColor: selected ? opt.bg : (isDark ? '#374151' : '#F3F4F6') }]}>
                    <Ionicons name={opt.icon} size={20} color={selected ? opt.color : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[s.optionDesc, { color: colors.muted }]}>{opt.description}</Text>
                  </View>
                  <View style={[s.radio, { borderColor: selected ? brand : colors.border }]}>
                    {selected && <View style={[s.radioDot, { backgroundColor: brand }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Join Mode */}
          <Text style={[s.sectionTitle, { color: colors.text }]}>Cách tham gia</Text>
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border, padding: 4 }]}>
            {JOIN_OPTIONS.map((opt, idx) => {
              const selected = joinMode === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setJoinMode(opt.value)}
                  style={[
                    s.optionRow,
                    selected && { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF' },
                    idx < JOIN_OPTIONS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={[s.optionIcon, { backgroundColor: selected ? '#EFF6FF' : (isDark ? '#374151' : '#F3F4F6') }]}>
                    <Ionicons name={opt.icon} size={20} color={selected ? brand : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, { color: colors.text }]}>{opt.label}</Text>
                    <Text style={[s.optionDesc, { color: colors.muted }]}>{opt.description}</Text>
                  </View>
                  <View style={[s.radio, { borderColor: selected ? brand : colors.border }]}>
                    {selected && <View style={[s.radioDot, { backgroundColor: brand }]} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Info box */}
          <View style={[s.infoBox, { backgroundColor: isDark ? '#1E3A5F' : '#EFF6FF', borderColor: isDark ? '#2563EB' : '#BFDBFE' }]}>
            <Ionicons name="information-circle" size={18} color={brand} style={{ marginTop: 1 }} />
            <Text style={[s.infoText, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
              Khi tạo cộng đồng, bạn sẽ là chủ sở hữu và có toàn quyền quản trị. Cộng đồng sẽ tự động có 3 kênh mặc định: <Text style={{ fontWeight: '700' }}>general</Text>, <Text style={{ fontWeight: '700' }}>announcements</Text>, <Text style={{ fontWeight: '700' }}>media</Text>.
            </Text>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            onPress={handleCreate}
            disabled={loading || !name.trim()}
            style={[s.createBtn, { backgroundColor: name.trim() && !loading ? brand : '#D1D5DB' }]}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" style={{ marginRight: 10 }} />
            ) : (
              <Ionicons name="sparkles" size={20} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={s.createBtnText}>{loading ? 'Đang tạo...' : 'Tạo cộng đồng'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 8, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', marginLeft: 4 },
  doneBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 40 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatarWrap: { position: 'relative' },
  avatarImg: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: { fontSize: 12 },

  // Card
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    padding: 16,
  },

  // Fields
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  nameInput: { fontSize: 18, fontWeight: '600', paddingVertical: 4 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  descInput: { fontSize: 15, minHeight: 70, lineHeight: 22, paddingTop: 0 },
  counter: { fontSize: 11, textAlign: 'right', marginTop: 4 },

  // Section title
  sectionTitle: { fontSize: 14, fontWeight: '700', marginTop: 4, marginBottom: 4, paddingHorizontal: 4 },

  // Option row
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 14,
    borderRadius: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  optionDesc: { fontSize: 12 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },

  // Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 20 },

  // Create button
  createBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1D67FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

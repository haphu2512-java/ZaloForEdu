import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { useAuth } from '@/context/auth';
import { createPost } from '@/utils/socialService';
import { uploadImageToCloudinary } from '@/utils/mediaService';

type Privacy = 'public' | 'friends' | 'private';
const PRIVACY_LABELS: Record<Privacy, { label: string; icon: string }> = {
  public: { label: 'Công khai', icon: 'earth' },
  friends: { label: 'Bạn bè', icon: 'people' },
  private: { label: 'Chỉ mình tôi', icon: 'lock-closed' },
};

export default function CreatePostScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [posting, setPosting] = useState(false);

  const username = user?.username || 'Bạn';
  const avatarUrl = user?.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0068FF&color=fff&size=100&bold=true`;

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Lỗi', 'Cần cấp quyền truy cập thư viện ảnh');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets?.length) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 10));
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const cyclePrivacy = () => {
    const order: Privacy[] = ['public', 'friends', 'private'];
    const idx = order.indexOf(privacy);
    setPrivacy(order[(idx + 1) % order.length]);
  };

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) {
      Alert.alert('Thông báo', 'Hãy viết gì đó hoặc thêm ảnh');
      return;
    }
    setPosting(true);
    try {
      const mediaUrls: { url: string; type: 'image' }[] = [];
      for (const uri of images) {
        const uploadedUrl = await uploadImageToCloudinary(uri);
        mediaUrls.push({ url: uploadedUrl, type: 'image' });
      }

      await createPost({ content: content.trim(), mediaUrls, privacy });
      router.back();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể đăng bài');
    } finally {
      setPosting(false);
    }
  };

  const canPost = content.trim().length > 0 || images.length > 0;

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[s.customHeader, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
        <View style={s.headerContent}>
          <TouchableOpacity style={s.headerBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.headerTitle, { color: colors.text }]}>Tạo bài viết</Text>
          <TouchableOpacity
            style={[s.postBtn, { backgroundColor: canPost ? '#1D67FF' : colors.border, opacity: posting ? 0.7 : 1 }]}
            onPress={handlePost}
            disabled={!canPost || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[s.postBtnText, { color: canPost ? '#fff' : colors.muted }]}>Đăng</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) }]} 
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.authorRow}>
          <Image source={{ uri: avatarUrl }} style={s.avatar} />
          <View>
            <Text style={[s.username, { color: colors.text }]}>{username}</Text>
            <TouchableOpacity style={[s.privacyBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F1F5F9' }]} onPress={cyclePrivacy}>
              <Ionicons name={PRIVACY_LABELS[privacy].icon as any} size={14} color={colorScheme === 'dark' ? '#94A3B8' : '#475569'} />
              <Text style={[s.privacyText, { color: colorScheme === 'dark' ? '#E2E8F0' : '#334155' }]}>{PRIVACY_LABELS[privacy].label}</Text>
              <Ionicons name="chevron-down" size={12} color={colorScheme === 'dark' ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={[s.input, { color: colors.text }]}
          placeholder="Bạn đang nghĩ gì?"
          placeholderTextColor={colors.muted}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
        />

        {images.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.imageRow}>
            {images.map((uri, idx) => (
              <View key={idx} style={s.imagePreview}>
                <Image source={{ uri }} style={s.previewImg} />
                <TouchableOpacity style={s.removeImgBtn} onPress={() => removeImage(idx)}>
                  <View style={s.removeImgBg}>
                    <Ionicons name="close" size={16} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <View style={[s.toolbar, { backgroundColor: colors.surface, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={s.toolBtn} onPress={pickImages}>
          <Ionicons name="images" size={24} color="#10B981" />
          <Text style={[s.toolLabel, { color: colors.text }]}>Ảnh/Video</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
          <Ionicons name="happy" size={24} color="#F59E0B" />
          <Text style={[s.toolLabel, { color: colors.text }]}>Cảm xúc</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.toolBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
          <Ionicons name="location" size={24} color="#EF4444" />
          <Text style={[s.toolLabel, { color: colors.text }]}>Vị trí</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  customHeader: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(150,150,150,0.2)' },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16 },
  headerBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scrollContent: { padding: 16 },
  postBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  postBtnText: { fontWeight: '700', fontSize: 14 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  username: { fontSize: 16, fontWeight: '700' },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  privacyText: { fontSize: 12, fontWeight: '600' },
  input: { fontSize: 18, lineHeight: 26, minHeight: 150 },
  imageRow: { gap: 12, paddingTop: 16 },
  imagePreview: { position: 'relative' },
  previewImg: { width: 120, height: 160, borderRadius: 12 },
  removeImgBtn: { position: 'absolute', top: 6, right: 6, zIndex: 10 },
  removeImgBg: { backgroundColor: 'rgba(0,0,0,0.6)', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolbar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, paddingHorizontal: 8 },
  toolBtn: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 4 },
  toolLabel: { fontSize: 12, fontWeight: '500' },
});

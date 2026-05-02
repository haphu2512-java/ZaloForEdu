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
  Keyboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

// --- Dynamic Media Grid Component ---
const MediaGrid = ({ images, onRemove }: { images: string[]; onRemove: (idx: number) => void }) => {
  if (images.length === 0) return null;

  const renderImage = (uri: string, idx: number, style: any) => (
    <View key={idx} style={[style, { position: 'relative', overflow: 'hidden' }]}>
      <Image source={{ uri }} style={{ width: '100%', height: '100%' }} />
      <TouchableOpacity 
        style={styles.removeImgBtn}
        onPress={() => onRemove(idx)}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  if (images.length === 1) {
    return renderImage(images[0], 0, { width: '100%', aspectRatio: 4 / 3, borderRadius: 12 });
  }
  if (images.length === 2) {
    return (
      <View style={{ flexDirection: 'row', gap: 4, height: 250, borderRadius: 12, overflow: 'hidden' }}>
        {renderImage(images[0], 0, { flex: 1, height: '100%' })}
        {renderImage(images[1], 1, { flex: 1, height: '100%' })}
      </View>
    );
  }
  if (images.length === 3) {
    return (
      <View style={{ gap: 4, borderRadius: 12, overflow: 'hidden' }}>
        {renderImage(images[0], 0, { width: '100%', height: 200 })}
        <View style={{ flexDirection: 'row', gap: 4, height: 140 }}>
          {renderImage(images[1], 1, { flex: 1, height: '100%' })}
          {renderImage(images[2], 2, { flex: 1, height: '100%' })}
        </View>
      </View>
    );
  }
  return (
    <View style={{ gap: 4, borderRadius: 12, overflow: 'hidden' }}>
      {renderImage(images[0], 0, { width: '100%', height: 200 })}
      <View style={{ flexDirection: 'row', gap: 4, height: 120 }}>
        {renderImage(images[1], 1, { flex: 1, height: '100%' })}
        {renderImage(images[2], 2, { flex: 1, height: '100%' })}
        <View style={{ flex: 1, height: '100%', position: 'relative' }}>
          {renderImage(images[3], 3, { width: '100%', height: '100%' })}
          {images.length > 4 && (
            <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} pointerEvents="none">
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700' }}>+{images.length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

export default function CreatePostScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [posting, setPosting] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  React.useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

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
      quality: 0.8,
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
  // Dynamic font size for a more immersive feel
  const inputFontSize = content.length < 80 ? 24 : 18;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* --- HEADER --- */}
      <View style={[styles.header, { backgroundColor: colors.surface, paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Tạo bài viết</Text>
          <TouchableOpacity
            style={[styles.postBtn, { backgroundColor: canPost ? '#0068FF' : colors.border, opacity: posting ? 0.7 : 1 }]}
            onPress={handlePost}
            disabled={!canPost || posting}
          >
            {posting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={[styles.postBtnText, { color: canPost ? '#fff' : colors.muted }]}>Đăng</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* --- CONTENT --- */}
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 }]} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.authorRow}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          <View>
            <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
            <TouchableOpacity style={[styles.privacyBtn, { backgroundColor: colorScheme === 'dark' ? '#374151' : '#F1F5F9' }]} onPress={cyclePrivacy} activeOpacity={0.7}>
              <Ionicons name={PRIVACY_LABELS[privacy].icon as any} size={13} color={colorScheme === 'dark' ? '#94A3B8' : '#475569'} />
              <Text style={[styles.privacyText, { color: colorScheme === 'dark' ? '#E2E8F0' : '#334155' }]}>{PRIVACY_LABELS[privacy].label}</Text>
              <Ionicons name="caret-down" size={11} color={colorScheme === 'dark' ? '#94A3B8' : '#475569'} />
            </TouchableOpacity>
          </View>
        </View>

        <TextInput
          style={[styles.input, { color: colors.text, fontSize: inputFontSize }]}
          placeholder="Bạn đang nghĩ gì?"
          placeholderTextColor={colors.muted}
          value={content}
          onChangeText={setContent}
          multiline
          autoFocus
          textAlignVertical="top"
          selectionColor="#0068FF"
        />

        {/* Media Grid Placeholder */}
        <View style={styles.mediaContainer}>
          <MediaGrid images={images} onRemove={removeImage} />
        </View>
      </ScrollView>

      {/* --- TOOLBAR --- */}
      <View style={[
        styles.toolbar, 
        { 
          backgroundColor: colors.surface, 
          borderTopColor: colorScheme === 'dark' ? '#333' : '#E2E8F0',
          paddingBottom: isKeyboardVisible ? 12 : Math.max(insets.bottom, 12)
        }
      ]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.toolbarScroll}>
          <TouchableOpacity style={styles.toolActionBtn} onPress={pickImages}>
            <Ionicons name="image" size={24} color="#10B981" />
            <Text style={[styles.toolLabel, { color: colors.text }]}>Ảnh/Video</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolActionBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
            <Ionicons name="document-text" size={24} color="#8B5CF6" />
            <Text style={[styles.toolLabel, { color: colors.text }]}>Tài liệu</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolActionBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
            <Ionicons name="stats-chart" size={24} color="#F59E0B" />
            <Text style={[styles.toolLabel, { color: colors.text }]}>Tạo Poll</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.toolActionBtn} onPress={() => Alert.alert('Thông báo', 'Tính năng đang phát triển')}>
            <Ionicons name="happy" size={24} color="#EF4444" />
            <Text style={[styles.toolLabel, { color: colors.text }]}>Cảm xúc</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 16 },
  headerBtn: { padding: 4, marginLeft: -4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  postBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  postBtnText: { fontWeight: '700', fontSize: 14 },
  scrollContent: { padding: 16, flexGrow: 1 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  username: { fontSize: 16, fontWeight: '700' },
  privacyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  privacyText: { fontSize: 13, fontWeight: '600' },
  input: { minHeight: 120, lineHeight: 32, marginBottom: 20 },
  mediaContainer: { marginTop: 10 },
  removeImgBtn: { 
    position: 'absolute', top: 8, right: 8, zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)', width: 28, height: 28, borderRadius: 14, 
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)'
  },
  toolbar: { borderTopWidth: 1, paddingTop: 12 },
  toolbarScroll: { paddingHorizontal: 12, gap: 8 },
  toolActionBtn: { 
    flexDirection: 'row', alignItems: 'center', gap: 6, 
    paddingHorizontal: 16, paddingVertical: 8, 
    backgroundColor: 'rgba(150,150,150,0.08)', 
    borderRadius: 20 
  },
  toolLabel: { fontSize: 14, fontWeight: '600' },
});

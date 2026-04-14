import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack } from 'expo-router';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { deleteMediaById, getMediaById } from '@/utils/mediaService';
import type { MediaItem } from '@/types/chat';

export default function MediaManagerScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [mediaId, setMediaId] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [media, setMedia] = useState<MediaItem | null>(null);

  const handleFetchMedia = async () => {
    if (!mediaId.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập media ID');
      return;
    }
    setLoading(true);
    try {
      const data = await getMediaById(mediaId.trim());
      setMedia(data);
    } catch (error: any) {
      setMedia(null);
      Alert.alert('Lỗi', error.message || 'Không thể lấy thông tin media');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!media) return;
    const id = media._id || media.id || '';
    if (!id) return;

    Alert.alert('Xác nhận', 'Bạn chắc chắn muốn xóa media này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            setDeleting(true);
            await deleteMediaById(id);
            setMedia(null);
            Alert.alert('Thành công', 'Đã xóa media');
          } catch (error: any) {
            Alert.alert('Lỗi', error.message || 'Không thể xóa media');
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16 }}
    >
      <Stack.Screen options={{ title: 'Media Manager' }} />
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Media ID</Text>
        <TextInput
          placeholder="Nhập media id từ backend"
          placeholderTextColor={colors.muted}
          value={mediaId}
          onChangeText={setMediaId}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              backgroundColor: colors.background,
              color: colors.text,
            },
          ]}
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.tint }]}
          onPress={handleFetchMedia}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Lấy thông tin media</Text>
          )}
        </TouchableOpacity>
      </View>

      {media && (
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.text }]}>{media.fileName}</Text>
          <Text style={{ color: colors.text }}>ID: {media._id || media.id}</Text>
          <Text style={{ color: colors.text }}>MIME: {media.mimeType}</Text>
          <Text style={{ color: colors.text }}>Size: {media.size} bytes</Text>
          <Text style={{ color: colors.text }}>Storage: {media.storage}</Text>
          <Text style={{ color: colors.text }}>URL: {media.url}</Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#DC2626', marginTop: 14 }]}
            onPress={handleDeleteMedia}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Xóa media</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  label: { fontSize: 13, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '700' },
});

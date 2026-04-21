import React, { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCommunityStore } from '@/stores/communityStore';

export default function CreateCommunityScreen() {
  const router = useRouter();
  const { createCommunityItem } = useCommunityStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên cộng đồng');
      return;
    }
    try {
      setLoading(true);
      const created = await createCommunityItem({
        name: name.trim(),
        description: description.trim(),
        privacy: isPrivate ? 'private' : 'public',
      });
      router.replace({ pathname: '/community/[id]', params: { id: created._id } });
    } catch (e: any) {
      Alert.alert('Lỗi', e.message || 'Không thể tạo cộng đồng');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create Community</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ví dụ: CLB Công Nghệ"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { height: 90, textAlignVertical: 'top' }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Mô tả ngắn về cộng đồng..."
        multiline
      />

      <View style={styles.toggleRow}>
        <Text style={styles.label}>Private community</Text>
        <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ true: '#93C5FD' }} thumbColor={isPrivate ? '#1D67FF' : '#D1D5DB'} />
      </View>

      <TouchableOpacity style={[styles.createBtn, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
        <Text style={styles.createText}>{loading ? 'Đang tạo...' : 'Create Community'}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: '700', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, color: '#374151', fontWeight: '600', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  createBtn: {
    marginTop: 22,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#1D67FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

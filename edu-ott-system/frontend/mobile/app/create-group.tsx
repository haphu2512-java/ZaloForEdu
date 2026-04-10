import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { createConversation } from '@/utils/messageService';
import { getFriendList } from '@/utils/friendService';
import type { UserInfo } from '@/types/chat';
import { useEffect } from 'react';

function getUserId(u: UserInfo): string {
  return u._id || u.id || '';
}

export default function CreateGroupScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [name, setName] = useState('');
  const [friends, setFriends] = useState<UserInfo[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const res = await getFriendList(1, 200);
        setFriends(res.items || []);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const toggleMember = (id: string) => {
    if (!id) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên nhóm');
      return;
    }
    if (selectedIds.length < 1) {
      Alert.alert('Lỗi', 'Vui lòng chọn ít nhất 1 thành viên');
      return;
    }

    try {
      setCreating(true);
      const conversation = await createConversation({
        type: 'group',
        name: name.trim(),
        participantIds: selectedIds,
      });
      const conversationId = conversation._id || conversation.id;
      router.replace(`/chat/${conversationId}` as any);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo nhóm');
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Tạo nhóm' }} />

      <View style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Tên nhóm</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Nhập tên nhóm"
          placeholderTextColor={colors.muted}
          style={[styles.input, { borderColor: colors.border, color: colors.text }]}
        />
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Chọn thành viên</Text>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={friends}
          keyExtractor={(item, index) => getUserId(item) || `friend-${index}`}
          renderItem={({ item }) => {
            const id = getUserId(item);
            const checked = selectedSet.has(id);
            return (
              <TouchableOpacity
                style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => toggleMember(id)}
              >
                <Text style={{ color: colors.text, flex: 1 }}>{item.username}</Text>
                <Text style={{ color: checked ? '#16A34A' : colors.muted, fontWeight: '700' }}>
                  {checked ? 'Đã chọn' : 'Chọn'}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.muted }}>Không có bạn bè để tạo nhóm</Text>
            </View>
          }
        />
      )}

      <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.createBtn, { backgroundColor: creating ? '#93C5FD' : colors.tint }]}
          onPress={handleCreate}
          disabled={creating}
        >
          {creating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.createText}>Tạo nhóm</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  box: {
    margin: 14,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  sectionTitle: { marginHorizontal: 14, marginBottom: 8, fontWeight: '700' },
  row: {
    marginHorizontal: 14,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  createBtn: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  createText: { color: '#fff', fontWeight: '700' },
});

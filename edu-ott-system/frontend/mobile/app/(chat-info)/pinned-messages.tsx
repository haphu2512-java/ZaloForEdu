/**
 * app/pinned-messages.tsx
 * Màn hình Bảng tin nhóm — xem tất cả ghim
 * Feature 2: Multiple Pinned Messages
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, RefreshControl
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getPinnedMessages, unpinMessage, type PinnedItem } from '@/utils/groupFeatureService';

export default function PinnedMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [pins, setPins] = useState<PinnedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await getPinnedMessages(id);
      setPins([...data].reverse()); // Mới nhất lên đầu
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tải bảng tin');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleUnpin = async (messageId: string) => {
    Alert.alert('Bỏ ghim?', 'Tin nhắn sẽ bị xóa khỏi bảng tin của nhóm.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Bỏ ghim',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await unpinMessage(id, messageId);
            setPins([...updated].reverse());
          } catch (err: any) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  };

  const renderPin = ({ item, index }: { item: PinnedItem; index: number }) => {
    const msg = item.messageId;
    const pinnedBy = item.pinnedBy;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {/* Index badge */}
        <View style={[styles.indexBadge, { backgroundColor: brand }]}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>#{index + 1}</Text>
        </View>

        {/* Message content */}
        <View style={{ flex: 1, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Image
              source={{ uri: msg?.senderId?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg?.senderId?.username || 'U')}&background=2563EB&color=fff&size=60` }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
            <View>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>
                {msg?.senderId?.username || 'Người dùng'}
              </Text>
              <Text style={{ color: colors.muted, fontSize: 11 }}>
                {msg?.createdAt ? new Date(msg.createdAt).toLocaleString('vi-VN') : ''}
              </Text>
            </View>
          </View>

          <Text style={[styles.content, { color: colors.text }]} numberOfLines={4}>
            {msg?.content || '(Tin nhắn media hoặc tệp đính kèm)'}
          </Text>

          <View style={[styles.pinnedByRow, { borderTopColor: colors.border }]}>
            <Text style={{ color: colors.muted, fontSize: 11 }}>
              📌 Ghim bởi{' '}
              <Text style={{ fontWeight: '600' }}>{pinnedBy?.username || 'Admin'}</Text>
              {' · '}{new Date(item.pinnedAt).toLocaleDateString('vi-VN')}
            </Text>
          </View>
        </View>

        {/* Unpin button (admin only - simplified) */}
        <TouchableOpacity
          onPress={() => handleUnpin(msg._id)}
          style={[styles.unpinBtn, { borderColor: colors.border }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={16} color={colors.muted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: '📌 Bảng tin nhóm',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible:true,
          headerTitleStyle: { fontWeight: '700' },
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand} />
        </View>
      ) : (
        <FlatList
          data={pins}
          keyExtractor={(item, idx) => item.messageId?._id || String(idx)}
          renderItem={renderPin}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={brand} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="pin-outline" size={48} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>Chưa có tin nhắn nào được ghim</Text>
              <Text style={{ color: colors.muted, fontSize: 13, marginTop: 6 }}>Nhấn giữ tin nhắn trong chat và chọn Ghim để thêm vào đây</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  content: { fontSize: 14, lineHeight: 21 },
  pinnedByRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, marginTop: 4 },
  unpinBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    borderWidth: 1,
    borderRadius: 12,
  },
});

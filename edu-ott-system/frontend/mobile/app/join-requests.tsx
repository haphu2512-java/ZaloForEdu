/**
 * app/join-requests.tsx
 * Màn hình duyệt thành viên cho Admin nhóm
 * Feature 4: Join Approval
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, FlatList, Image, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet, RefreshControl
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { listJoinRequests, processJoinRequest, type JoinRequest } from '@/utils/groupFeatureService';

export default function JoinRequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const data = await listJoinRequests(id, 'pending');
      setRequests(data);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handle = async (requestId: string, action: 'approve' | 'reject') => {
    Alert.alert(
      action === 'approve' ? 'Duyệt thành viên?' : 'Từ chối?',
      action === 'approve'
        ? 'Người này sẽ được thêm vào nhóm ngay lập tức.'
        : 'Yêu cầu tham gia sẽ bị từ chối.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: action === 'approve' ? 'Duyệt' : 'Từ chối',
          style: action === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              setProcessingId(requestId);
              await processJoinRequest(id, requestId, action);
              setRequests((prev) => prev.filter((r) => r._id !== requestId));
              Alert.alert('Thành công', action === 'approve' ? 'Đã duyệt thành viên' : 'Đã từ chối');
            } catch (err: any) {
              Alert.alert('Lỗi', err.message);
            } finally {
              setProcessingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: JoinRequest }) => {
    const u = item.userId;
    const isProcessing = processingId === item._id;

    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image
          source={{ uri: u?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u?.username || 'U')}&background=8B5CF6&color=fff&size=100` }}
          style={styles.avatar}
        />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.name, { color: colors.text }]}>{u?.username || 'Người dùng'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>{u?.email || u?.phone || ''}</Text>
          {item.reason ? (
            <Text style={[styles.reason, { backgroundColor: colors.background, color: colors.text }]}>
              "{item.reason}"
            </Text>
          ) : null}
          <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>
            {new Date(item.createdAt).toLocaleString('vi-VN')}
          </Text>
        </View>
        {isProcessing ? (
          <ActivityIndicator color={brand} />
        ) : (
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#DCFCE7' }]}
              onPress={() => handle(item._id, 'approve')}
            >
              <Ionicons name="checkmark" size={16} color="#166534" />
              <Text style={{ color: '#166534', fontWeight: '700', fontSize: 12 }}>Duyệt</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: '#FEE2E2' }]}
              onPress={() => handle(item._id, 'reject')}
            >
              <Ionicons name="close" size={16} color="#991B1B" />
              <Text style={{ color: '#991B1B', fontWeight: '700', fontSize: 12 }}>Từ chối</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: '🛡 Duyệt thành viên',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={brand} />
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={brand} />}
          ListHeaderComponent={
            <Text style={{ color: colors.muted, fontSize: 13, marginBottom: 8 }}>
              {requests.length} yêu cầu đang chờ duyệt
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.muted} />
              <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>
                Không có yêu cầu nào đang chờ
              </Text>
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
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  name: { fontSize: 16, fontWeight: '700' },
  reason: { fontSize: 13, fontStyle: 'italic', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, gap: 4 },
});

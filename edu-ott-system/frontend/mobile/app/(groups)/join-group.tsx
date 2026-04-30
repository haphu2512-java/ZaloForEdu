/**
 * app/join-group.tsx
 * Màn hình xem preview nhóm và tham gia qua invite link/QR
 * Feature 5: Invite Links
 */
import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ActivityIndicator,
  Alert, StyleSheet
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { previewGroupByCode, joinGroupByCode, type GroupPreview } from '@/utils/groupFeatureService';

export default function JoinGroupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [preview, setPreview] = useState<GroupPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) { setError('Mã mời không hợp lệ'); setLoading(false); return; }
    previewGroupByCode(code)
      .then(setPreview)
      .catch((err) => setError(err.message || 'Link mời không hợp lệ hoặc đã hết hạn'))
      .finally(() => setLoading(false));
  }, [code]);

  const handleJoin = async () => {
    if (!code) return;
    try {
      setJoining(true);
      const result = await joinGroupByCode(code);
      const conversationId = result.conversation?._id || (result as any)?._id;

      if (result.requiresApproval) {
        Alert.alert(
          '✅ Đã gửi yêu cầu',
          'Nhóm này yêu cầu duyệt thành viên. Admin nhóm sẽ xem xét yêu cầu của bạn.',
          [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
        );
      } else {
        Alert.alert(
          '🎉 Tham gia thành công!',
          `Bạn đã vào nhóm "${preview?.name}"`,
          [{ text: 'Vào nhóm', onPress: () => router.replace(conversationId ? (`/chat/${conversationId}` as any) : '/(tabs)') }],
        );
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể tham gia nhóm');
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={brand} />
        <Text style={{ color: colors.muted, marginTop: 12 }}>Đang kiểm tra link mời...</Text>
      </View>
    );
  }

  if (error || !preview) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerTitle: 'Tham gia nhóm', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />
        <Ionicons name="link-outline" size={60} color={colors.muted} />
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 16 }}>Link không hợp lệ</Text>
        <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 8, lineHeight: 22 }}>
          {error || 'Link mời có thể đã hết hạn hoặc được reset bởi Admin nhóm.'}
        </Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: brand, marginTop: 24 }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Về trang chủ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const groupAvatar = preview.avatarUrl
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(preview.name)}&background=8B5CF6&color=fff&size=200&bold=true`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerTitle: 'Tham gia nhóm', headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }} />

      {/* Card preview */}
      <View style={[styles.previewCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Image source={{ uri: groupAvatar }} style={styles.groupAvatar} />
        <Text style={[styles.groupName, { color: colors.text }]}>{preview.name}</Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
          {preview.memberCount} thành viên
        </Text>

        {preview.isApprovalRequired && (
          <View style={[styles.approvalBadge, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="shield" size={14} color="#92400E" />
            <Text style={{ color: '#92400E', fontSize: 12, fontWeight: '600' }}>
              Nhóm yêu cầu duyệt thành viên
            </Text>
          </View>
        )}

        <Text style={{ color: colors.muted, textAlign: 'center', fontSize: 13, marginTop: 16, lineHeight: 20 }}>
          {preview.isApprovalRequired
            ? 'Bạn sẽ cần được Admin duyệt trước khi vào nhóm.'
            : 'Nhấn "Tham gia" để vào nhóm ngay lập tức.'}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={handleJoin}
          disabled={joining}
          style={[styles.primaryBtn, { backgroundColor: brand }]}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name={preview.isApprovalRequired ? 'send' : 'people'} size={20} color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
                {preview.isApprovalRequired ? 'Gửi yêu cầu tham gia' : 'Tham gia nhóm'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.secondaryBtn, { borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Hủy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  previewCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginTop: 32,
    gap: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  groupAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  groupName: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  approvalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginTop: 12,
  },
  actions: { marginTop: 32, gap: 12 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
  },
});

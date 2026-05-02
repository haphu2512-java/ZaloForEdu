import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/context/auth';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';
import { getConversations } from '@/utils/messageService';
import {
  blockMember,
  listBlockedMembers,
  type GroupBlockedMember,
  unblockMember,
} from '@/utils/groupFeatureService';

function normalizeId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '');
}

export default function BlockedMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [blocked, setBlocked] = useState<GroupBlockedMember[]>([]);

  const currentUserId = String(user?.id || (user as any)?._id || '');
  const ownerId = normalizeId(conversation?.ownerId || conversation?.createdBy);
  const adminIds = (conversation?.adminIds || []).map((a: any) => normalizeId(a));
  const isAdmin = ownerId === currentUserId || adminIds.includes(currentUserId);

  const memberCandidates = useMemo(() => {
    const blockedSet = new Set(blocked.map((b) => normalizeId(b)));
    return (conversation?.participants || []).filter((p: any) => {
      const pid = normalizeId(p);
      if (!pid) return false;
      if (pid === currentUserId) return false;
      if (pid === ownerId) return false;
      return !blockedSet.has(pid);
    });
  }, [blocked, conversation?.participants, currentUserId, ownerId]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [convRes, blockedRes] = await Promise.all([
        getConversations(null, 100),
        listBlockedMembers(id),
      ]);
      const matched = (convRes?.items || []).find((c: any) => String(c._id || c.id) === String(id));
      setConversation(matched || null);
      setBlocked(blockedRes || []);
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the tai danh sach chan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onBlock = async (memberId: string, name: string) => {
    Alert.alert('Chan thanh vien?', `${name} se khong the tham gia lai nhom cho den khi bo chan.`, [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Chan',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmittingId(memberId);
            await blockMember(String(id), memberId);
            await load();
          } catch (error: any) {
            Alert.alert('Loi', error.message || 'Khong the chan thanh vien');
          } finally {
            setSubmittingId(null);
          }
        },
      },
    ]);
  };

  const onUnblock = async (memberId: string) => {
    try {
      setSubmittingId(memberId);
      await unblockMember(String(id), memberId);
      await load();
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the bo chan');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <Ionicons name="lock-closed-outline" size={44} color={colors.muted} />
        <Text style={{ color: colors.muted, marginTop: 10 }}>Chi truong/pho nhom moi co quyen quan ly chan</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <Stack.Screen
        options={{
          headerTitle: 'Chan khoi nhom',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <FlatList
        data={blocked}
        keyExtractor={(item, index) => normalizeId(item) || `blocked-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={brand} />}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        ListHeaderComponent={
          <View style={{ marginBottom: 12 }}>
            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Them vao danh sach chan</Text>
            {memberCandidates.length === 0 ? (
              <Text style={{ color: colors.muted }}>Khong con thanh vien phu hop de chan</Text>
            ) : (
              memberCandidates.map((member: any) => {
                const mid = normalizeId(member);
                return (
                  <View key={mid} style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <View style={styles.userInfo}> 
                      <Image source={{ uri: member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}` }} style={styles.avatar} />
                      <Text style={{ color: colors.text, fontWeight: '600' }}>{member.username || 'Thanh vien'}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onBlock(mid, member.username || 'Thanh vien')}
                      style={[styles.blockBtn, { backgroundColor: '#FEE2E2' }]}
                      disabled={submittingId === mid}
                    >
                      {submittingId === mid ? <ActivityIndicator size="small" color="#B91C1C" /> : <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Chan</Text>}
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, marginTop: 16, marginBottom: 8 }}>
              Da bi chan ({blocked.length})
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="shield-checkmark-outline" size={46} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Chua co ai bi chan</Text>
          </View>
        }
        renderItem={({ item }) => {
          const uid = normalizeId(item);
          return (
            <View style={[styles.rowCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <View style={styles.userInfo}> 
                <Image source={{ uri: item.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.username || 'U')}` }} style={styles.avatar} />
                <View>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{item.username || 'Thanh vien'}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>{item.email || item.phone || ''}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => onUnblock(uid)}
                style={[styles.blockBtn, { backgroundColor: '#DBEAFE' }]}
                disabled={submittingId === uid}
              >
                {submittingId === uid ? <ActivityIndicator size="small" color="#1D4ED8" /> : <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>Bo chan</Text>}
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  rowCard: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  blockBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
});


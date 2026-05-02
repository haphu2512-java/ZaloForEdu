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
import {
  demoteGroupAdmin,
  getConversations,
  promoteGroupAdmin,
  transferGroupOwner,
} from '@/utils/messageService';

function normalizeId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '');
}

export default function GroupRolesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<any>(null);

  const currentUserId = String(user?.id || (user as any)?._id || '');
  const ownerId = normalizeId(conversation?.ownerId || conversation?.createdBy);
  const adminIds = (conversation?.adminIds || []).map((a: any) => normalizeId(a));
  const isOwner = ownerId === currentUserId;

  const getRole = useCallback((member: any) => {
    const mid = normalizeId(member);
    if (mid === ownerId) return 'owner';
    if (adminIds.includes(mid)) return 'admin';
    return 'member';
  }, [adminIds, ownerId]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const convRes = await getConversations(null, 100);
      const matched = (convRes?.items || []).find((c: any) => String(c._id || c.id) === String(id));
      setConversation(matched || null);
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the tai vai tro nhom');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const owner = useMemo(
    () => (conversation?.participants || []).find((m: any) => normalizeId(m) === ownerId),
    [conversation?.participants, ownerId],
  );

  const admins = useMemo(
    () => (conversation?.participants || []).filter((m: any) => getRole(m) === 'admin'),
    [conversation?.participants, getRole],
  );

  const members = useMemo(
    () => (conversation?.participants || []).filter((m: any) => getRole(m) === 'member'),
    [conversation?.participants, getRole],
  );

  const handlePromote = (member: any) => {
    const uid = normalizeId(member);
    Alert.alert('Them pho nhom?', `Bo nhiem ${member.username} lam pho nhom?`, [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Xac nhan',
        onPress: async () => {
          try {
            setSubmittingId(uid);
            await promoteGroupAdmin(String(id), uid);
            await load();
          } catch (error: any) {
            Alert.alert('Loi', error.message || 'Khong the cap quyen pho nhom');
          } finally {
            setSubmittingId(null);
          }
        },
      },
    ]);
  };

  const handleDemote = (member: any) => {
    const uid = normalizeId(member);
    Alert.alert('Go quyen pho nhom?', `Ban co chac chan muon go quyen cua ${member.username}?`, [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Go quyen',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmittingId(uid);
            await demoteGroupAdmin(String(id), uid);
            await load();
          } catch (error: any) {
            Alert.alert('Loi', error.message || 'Khong the go quyen pho nhom');
          } finally {
            setSubmittingId(null);
          }
        },
      },
    ]);
  };

  const handleTransfer = (member: any) => {
    const uid = normalizeId(member);
    Alert.alert('Chuyen quyen truong nhom?', `Chuyen quyen cho ${member.username}? Ban se tro thanh pho nhom.`, [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Chuyen quyen',
        style: 'destructive',
        onPress: async () => {
          try {
            setSubmittingId(uid);
            await transferGroupOwner(String(id), { newOwnerId: uid });
            await load();
          } catch (error: any) {
            Alert.alert('Loi', error.message || 'Khong the chuyen quyen truong nhom');
          } finally {
            setSubmittingId(null);
          }
        },
      },
    ]);
  };

  const renderMember = (member: any, roleLabel: string, color: string, action?: React.ReactNode) => (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.userInfo}> 
        <Image source={{ uri: member.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.username || 'U')}` }} style={styles.avatar} />
        <View>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{member.username || 'Thanh vien'}</Text>
          <Text style={{ color, fontWeight: '600', fontSize: 12 }}>{roleLabel}</Text>
        </View>
      </View>
      {action}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={brand} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          headerTitle: 'Truong & pho nhom',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
        }}
      />

      <FlatList
        data={members}
        keyExtractor={(item, index) => normalizeId(item) || `member-${index}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={brand} />}
        contentContainerStyle={{ padding: 14, gap: 10 }}
        ListHeaderComponent={
          <View style={{ gap: 10, marginBottom: 6 }}>
            {owner ? renderMember(owner, 'Truong nhom', '#D97706') : null}
            {admins.map((admin: any) => {
              const aid = normalizeId(admin);
              return renderMember(
                admin,
                'Pho nhom',
                '#2563EB',
                isOwner ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleTransfer(admin)}>
                      <Text style={{ color: '#92400E', fontWeight: '700' }}>Len truong</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDemote(admin)}>
                      {submittingId === aid ? <ActivityIndicator size="small" color="#B91C1C" /> : <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Ha quyen</Text>}
                    </TouchableOpacity>
                  </View>
                ) : null,
              );
            })}
            <Text style={{ color: colors.text, fontWeight: '700', marginTop: 8 }}>Thanh vien ({members.length})</Text>
          </View>
        }
        renderItem={({ item }) => {
          const mid = normalizeId(item);
          return renderMember(
            item,
            'Thanh vien',
            colors.muted,
            isOwner ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#ECFDF5' }]} onPress={() => handlePromote(item)}>
                  {submittingId === mid ? <ActivityIndicator size="small" color="#047857" /> : <Text style={{ color: '#047857', fontWeight: '700' }}>Len pho</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, { backgroundColor: '#FEF3C7' }]} onPress={() => handleTransfer(item)}>
                  <Text style={{ color: '#92400E', fontWeight: '700' }}>Len truong</Text>
                </TouchableOpacity>
              </View>
            ) : null,
          );
        }}
        ListEmptyComponent={<Text style={{ color: colors.muted }}>Khong co thanh vien nao</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
});


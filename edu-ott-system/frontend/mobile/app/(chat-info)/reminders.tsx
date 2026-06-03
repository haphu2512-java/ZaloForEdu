import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  createReminder,
  declineReminder,
  deleteReminder,
  getReminders,
  joinReminder,
  type Reminder,
  updateReminder,
} from '@/utils/groupFeatureService';
import { getSocket, connectSocket } from '@/utils/socketService';

function normalizeId(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return String(value._id || value.id || '');
}

export default function GroupRemindersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const brand = colors.tint;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Reminder[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [title, setTitle] = useState('');
  const [remindAt, setRemindAt] = useState('');

  const currentUserId = String(user?.id || (user as any)?._id || '');
  const ownerId = normalizeId(conversation?.ownerId || conversation?.createdBy);
  const adminIds = (conversation?.adminIds || []).map((a: any) => normalizeId(a));
  const isOwner = ownerId === currentUserId;
  const isAdmin = isOwner || adminIds.includes(currentUserId);
  const canCreateReminder = isAdmin || conversation?.settings?.canMembersCreateReminders !== false;

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const [convRes, reminderRes] = await Promise.all([
        getConversations(null, 100),
        getReminders(id),
      ]);
      const matched = (convRes?.items || []).find((c: any) => String(c._id || c.id) === String(id));
      setConversation(matched || null);
      setItems((reminderRes || []).sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the tai nhac hen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let active = true;
    let socketInstance: any = null;

    const onCreated = (reminder: Reminder) => {
      if (String(reminder?.conversationId) !== String(id)) return;
      setItems((prev) => {
        if (prev.some((r) => r._id === reminder._id)) return prev;
        return [...prev, reminder].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime());
      });
    };

    const onUpdated = (reminder: Reminder) => {
      if (String(reminder?.conversationId) !== String(id)) return;
      setItems((prev) => prev.map((r) => (r._id === reminder._id ? reminder : r)));
    };

    const onDeleted = (payload: { reminderId?: string; conversationId?: string }) => {
      if (payload?.conversationId && String(payload.conversationId) !== String(id)) return;
      if (!payload?.reminderId) return;
      setItems((prev) => prev.filter((r) => r._id !== payload.reminderId));
    };

    const setupSocket = async () => {
      const socket = await connectSocket();
      if (!active || !socket) return;
      socketInstance = socket;

      socket.on('reminder_created', onCreated);
      socket.on('reminder_updated', onUpdated);
      socket.on('reminder_deleted', onDeleted);
    };

    setupSocket();

    return () => {
      active = false;
      if (socketInstance) {
        socketInstance.off('reminder_created', onCreated);
        socketInstance.off('reminder_updated', onUpdated);
        socketInstance.off('reminder_deleted', onDeleted);
      }
    };
  }, [id]);

  const myReminderState = useCallback((reminder: Reminder) => {
    const joined = (reminder.participants || []).some((p) => normalizeId(p) === currentUserId);
    const declined = (reminder.declinedBy || []).some((p) => normalizeId(p) === currentUserId);
    return { joined, declined };
  }, [currentUserId]);

  const canEditReminder = useCallback((reminder: Reminder) => {
    const createdById = normalizeId(reminder.createdBy);
    return isAdmin || createdById === currentUserId;
  }, [currentUserId, isAdmin]);

  const openCreate = () => {
    if (!canCreateReminder) {
      Alert.alert('Khong co quyen', 'Ban khong duoc phep tao nhac hen trong nhom nay.');
      return;
    }
    setEditing(null);
    setTitle('');
    setRemindAt('');
    setEditorVisible(true);
  };

  const openEdit = (reminder: Reminder) => {
    if (!canEditReminder(reminder)) {
      Alert.alert('Khong co quyen', 'Ban khong the sua nhac hen nay.');
      return;
    }
    setEditing(reminder);
    setTitle(reminder.title || '');
    setRemindAt((reminder.remindAt || '').slice(0, 16));
    setEditorVisible(true);
  };

  const saveReminder = async () => {
    if (!id) return;
    if (!title.trim()) {
      Alert.alert('Thieu thong tin', 'Vui long nhap noi dung nhac hen.');
      return;
    }
    if (!remindAt) {
      Alert.alert('Thieu thong tin', 'Vui long chon thoi gian nhac.');
      return;
    }
    try {
      setSaving(true);
      if (editing) {
        const updated = await updateReminder(editing._id, {
          title: title.trim(),
          remindAt: new Date(remindAt).toISOString(),
        });
        setItems((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
      } else {
        const created = await createReminder({
          conversationId: id,
          title: title.trim(),
          remindAt: new Date(remindAt).toISOString(),
        });
        setItems((prev) => [...prev, created].sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()));
      }
      setEditorVisible(false);
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the luu nhac hen');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (reminder: Reminder) => {
    if (!canEditReminder(reminder)) {
      Alert.alert('Khong co quyen', 'Ban khong the xoa nhac hen nay.');
      return;
    }
    Alert.alert('Xoa nhac hen?', 'Ban co chac chan muon xoa nhac hen nay?', [
      { text: 'Huy', style: 'cancel' },
      {
        text: 'Xoa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteReminder(reminder._id);
            setItems((prev) => prev.filter((r) => r._id !== reminder._id));
          } catch (error: any) {
            Alert.alert('Loi', error.message || 'Khong the xoa nhac hen');
          }
        },
      },
    ]);
  };

  const handleJoin = async (reminderId: string) => {
    try {
      const updated = await joinReminder(reminderId);
      setItems((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the tham gia nhac hen');
    }
  };

  const handleDecline = async (reminderId: string) => {
    try {
      const updated = await declineReminder(reminderId);
      setItems((prev) => prev.map((r) => (r._id === updated._id ? updated : r)));
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the tu choi nhac hen');
    }
  };

  const summary = useMemo(() => {
    const upcoming = items.filter((r) => new Date(r.remindAt).getTime() >= Date.now()).length;
    return `${items.length} nhac hen • ${upcoming} sap toi`;
  }, [items]);

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
          headerTitle: 'Nhac hen nhom',
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerRight: () => (
            <TouchableOpacity onPress={openCreate} style={{ marginRight: 8 }}>
              <Ionicons name="add" size={24} color={canCreateReminder ? brand : colors.muted} />
            </TouchableOpacity>
          ),
        }}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={brand} />}
        contentContainerStyle={{ padding: 14, gap: 10, flexGrow: items.length === 0 ? 1 : 0 }}
        ListHeaderComponent={<Text style={{ color: colors.muted, marginBottom: 8 }}>{summary}</Text>}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="calendar-outline" size={46} color={colors.muted} />
            <Text style={{ color: colors.muted, marginTop: 8 }}>Chua co nhac hen nao</Text>
          </View>
        }
        renderItem={({ item }) => {
          const { joined, declined } = myReminderState(item);
          const canEdit = canEditReminder(item);
          return (
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{item.title}</Text>
              <Text style={{ color: colors.muted, marginTop: 6 }}>
                {new Date(item.remindAt).toLocaleString('vi-VN')}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4, fontSize: 12 }}>
                {(item.participants || []).length} tham gia • {(item.declinedBy || []).length} tu choi
              </Text>

              <View style={styles.row}> 
                {!joined && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#DBEAFE' }]} onPress={() => handleJoin(item._id)}>
                    <Text style={{ color: '#1D4ED8', fontWeight: '700' }}>Tham gia</Text>
                  </TouchableOpacity>
                )}
                {!declined && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]} onPress={() => handleDecline(item._id)}>
                    <Text style={{ color: '#B91C1C', fontWeight: '700' }}>Tu choi</Text>
                  </TouchableOpacity>
                )}
                {canEdit && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#ECFDF5' }]} onPress={() => openEdit(item)}>
                    <Text style={{ color: '#047857', fontWeight: '700' }}>Sua</Text>
                  </TouchableOpacity>
                )}
                {canEdit && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FFF1F2' }]} onPress={() => confirmDelete(item)}>
                    <Text style={{ color: '#BE123C', fontWeight: '700' }}>Xoa</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={editorVisible} transparent animationType="fade" onRequestClose={() => setEditorVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.editorCard, { backgroundColor: colors.surface }]}> 
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 12 }}>
              {editing ? 'Sua nhac hen' : 'Tao nhac hen'}
            </Text>
            <ScrollView>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Noi dung nhac hen..."
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              />
              <Text style={{ color: colors.muted, marginBottom: 6 }}>Thoi gian (YYYY-MM-DDTHH:mm)</Text>
              <TextInput
                value={remindAt}
                onChangeText={setRemindAt}
                placeholder="2026-05-01T09:00"
                placeholderTextColor={colors.muted}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              />
            </ScrollView>
            <View style={[styles.row, { marginTop: 14, justifyContent: 'flex-end' }]}> 
              <TouchableOpacity onPress={() => setEditorVisible(false)} style={[styles.modalBtn, { backgroundColor: '#E5E7EB' }]}>
                <Text style={{ color: '#111827', fontWeight: '700' }}>Huy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveReminder} disabled={saving} style={[styles.modalBtn, { backgroundColor: brand }]}>
                {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '700' }}>Luu</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 18 },
  editorCard: { borderRadius: 14, padding: 14, maxHeight: '70%' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  modalBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10 },
});


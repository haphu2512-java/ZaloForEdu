import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/Themed';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import type { NotificationItem } from '@/types/chat';
import {
  getNotifications,
  markNotificationRead,
} from '@/utils/notificationService';

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('vi-VN');
}

export default function NotificationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await getNotifications(1, 50);
    setItems(res.items || []);
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        await loadData();
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleMarkRead = async (item: NotificationItem) => {
    if (item.isRead) return;
    const id = item._id || item.id || '';
    if (!id) return;
    setProcessingId(id);
    try {
      await markNotificationRead(id);
      setItems((prev) =>
        prev.map((it) =>
          (it._id || it.id) === id
            ? { ...it, isRead: true, readAt: new Date().toISOString() }
            : it,
        ),
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: 'Thông báo' }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => item._id || item.id || `notification-${index}`}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={{ color: colors.muted }}>Không có thông báo</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isRead = item.isRead;
            const isProcessing = processingId === (item._id || item.id);
            return (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleMarkRead(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: isRead ? 0.8 : 1,
                  },
                ]}
              >
                <View style={styles.row}>
                  <Ionicons
                    name={isRead ? 'notifications-outline' : 'notifications'}
                    size={18}
                    color={isRead ? colors.muted : colors.tint}
                  />
                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
                </View>
                <Text style={[styles.body, { color: colors.text }]}>{item.body}</Text>
                <View style={styles.rowBetween}>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                  {isRead ? (
                    <Text style={{ color: '#16A34A', fontSize: 12, fontWeight: '700' }}>
                      Đã đọc
                    </Text>
                  ) : isProcessing ? (
                    <ActivityIndicator size="small" color={colors.tint} />
                  ) : (
                    <Text style={{ color: colors.tint, fontSize: 12, fontWeight: '700' }}>
                      Đánh dấu đã đọc
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '700', flex: 1 },
  body: { fontSize: 14, lineHeight: 20 },
});

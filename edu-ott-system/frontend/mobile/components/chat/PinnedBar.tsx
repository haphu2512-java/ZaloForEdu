/**
 * PinnedBar.tsx
 * Thanh ghim tin nhắn hiển thị ở đỉnh màn hình Chat
 * Feature 2: Bảng tin nhóm
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PinnedItem } from '@/utils/groupFeatureService';

type PinnedBarProps = {
  pinnedItems: PinnedItem[];
  colors: any;
  brand: string;
  onPress: () => void; // Mở Bảng tin đầy đủ
  onDismiss?: () => void;
};

export default function PinnedBar({ pinnedItems, colors, brand, onPress, onDismiss }: PinnedBarProps) {
  if (!pinnedItems || pinnedItems.length === 0) return null;

  // Lấy tin nhắn ghim mới nhất
  const latest = pinnedItems[pinnedItems.length - 1];
  const content = latest?.messageId?.content || '(Tin nhắn media)';
  const sender = latest?.messageId?.senderId?.username || 'Admin';

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.indicator, { backgroundColor: brand }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.label, { color: brand }]}>
          📌 Tin nhắn ghim ({pinnedItems.length})
        </Text>
        <Text style={[styles.content, { color: colors.text }]} numberOfLines={1}>
          <Text style={{ fontWeight: '600' }}>{sender}: </Text>
          {content}
        </Text>
      </View>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={18} color={colors.muted} />
        </TouchableOpacity>
      )}
      <Ionicons name="chevron-forward" size={16} color={colors.muted} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  indicator: {
    width: 3,
    height: 36,
    borderRadius: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  content: {
    fontSize: 13,
  },
});

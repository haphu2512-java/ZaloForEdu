import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { CommunityChannel } from '@/types/community';

type Props = {
  channels: CommunityChannel[];
  activeChannelId: string;
  onChange: (channelId: string) => void;
};

export default function ChannelTabs({ channels, activeChannelId, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {channels.map((ch) => {
          const active = ch._id === activeChannelId;
          return (
            <TouchableOpacity
              key={ch._id}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => onChange(ch._id)}
            >
              <Text style={[styles.text, active && styles.textActive]}>#{ch.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB' },
  row: { paddingHorizontal: 12, gap: 8 },
  tab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#EFF3F8' },
  tabActive: { backgroundColor: '#1D67FF' },
  text: { color: '#4B5563', fontWeight: '600' },
  textActive: { color: '#fff' },
});

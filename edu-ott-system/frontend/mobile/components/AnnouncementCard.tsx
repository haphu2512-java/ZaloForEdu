import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  content: string;
  senderName?: string;
  isPinned?: boolean;
  time: string;
};

export default function AnnouncementCard({ content, senderName, isPinned, time }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>📢 Thông báo</Text>
        {isPinned ? <Text style={styles.pin}>📌</Text> : null}
      </View>
      {!!senderName && <Text style={styles.sender}>{senderName}</Text>}
      <Text style={styles.content}>{content}</Text>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#E8F1FF',
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#1D67FF',
    padding: 12,
    marginVertical: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#0B57D0', fontWeight: '700', fontSize: 14 },
  pin: { fontSize: 14 },
  sender: { marginTop: 6, fontSize: 12, color: '#2563EB', fontWeight: '600' },
  content: { marginTop: 6, color: '#1F2937', fontSize: 14, lineHeight: 20 },
  time: { marginTop: 8, color: '#6B7280', fontSize: 11, textAlign: 'right' },
});

import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { CommunityMember, CommunityRole } from '@/types/community';

type Props = {
  member: CommunityMember;
  currentRole: CommunityRole;
  onKick?: (memberId: string) => void;
  onPromote?: (memberId: string) => void;
};

const getUser = (user: CommunityMember['userId']) =>
  typeof user === 'string' ? { _id: user, username: 'user', avatarUrl: '' } : user;

export default function MemberItem({ member, currentRole, onKick, onPromote }: Props) {
  const user = getUser(member.userId);
  const memberId = user._id || user.id || '';
  const isAdmin = currentRole === 'owner' || currentRole === 'admin';
  const canManage = isAdmin && member.role !== 'owner';

  return (
    <View style={styles.row}>
      <Image
        source={{
          uri:
            user.avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'U')}&background=0EA5E9&color=fff`,
        }}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{user.username || 'Thành viên'}</Text>
        <View style={[styles.badge, member.role === 'admin' || member.role === 'owner' ? styles.badgeAdmin : styles.badgeMod]}>
          <Text style={styles.badgeText}>{member.role}</Text>
        </View>
      </View>

      {canManage ? (
        <View style={styles.actions}>
          {member.role === 'member' ? (
            <TouchableOpacity style={[styles.btn, styles.promote]} onPress={() => onPromote?.(memberId)}>
              <Text style={styles.promoteText}>Promote</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={[styles.btn, styles.kick]} onPress={() => onKick?.(memberId)}>
            <Text style={styles.kickText}>Kick</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  name: { color: '#111827', fontSize: 15, fontWeight: '600' },
  badge: { marginTop: 4, alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeAdmin: { backgroundColor: '#DBEAFE' },
  badgeMod: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 11, textTransform: 'uppercase', color: '#1F2937', fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  promote: { backgroundColor: '#E0E7FF' },
  kick: { backgroundColor: '#FEE2E2' },
  promoteText: { color: '#3730A3', fontWeight: '700', fontSize: 12 },
  kickText: { color: '#991B1B', fontWeight: '700', fontSize: 12 },
});

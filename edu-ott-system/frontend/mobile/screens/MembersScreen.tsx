import React, { useEffect } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import MemberItem from '@/components/MemberItem';
import { kickMember, promoteMemberToAdmin } from '@/services/communityService';
import type { CommunityMember, CommunityRole } from '@/types/community';
import { useCommunityStore } from '@/stores/communityStore';

type Props = {
  communityId: string;
  currentRole: CommunityRole;
};

export default function MembersScreen({ communityId, currentRole }: Props) {
  const { membersByCommunity, loadMembers } = useCommunityStore();
  const members = membersByCommunity[communityId] || [];

  useEffect(() => {
    loadMembers(communityId);
  }, [communityId, loadMembers]);

  const handleKick = async (memberId: string) => {
    Alert.alert('Kick member', 'Bạn có chắc muốn mời thành viên này ra khỏi cộng đồng?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Kick',
        style: 'destructive',
        onPress: async () => {
          await kickMember(communityId, memberId);
          await loadMembers(communityId);
        },
      },
    ]);
  };

  const handlePromote = async (memberId: string) => {
    await promoteMemberToAdmin(communityId, memberId);
    await loadMembers(communityId);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={(item: CommunityMember, idx) => `${typeof item.userId === 'string' ? item.userId : item.userId?._id || item.userId?.id || idx}`}
        renderItem={({ item }) => (
          <MemberItem member={item} currentRole={currentRole} onKick={handleKick} onPromote={handlePromote} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});

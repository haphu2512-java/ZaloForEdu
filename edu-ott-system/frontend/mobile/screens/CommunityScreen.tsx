import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import ChannelTabs from '@/components/ChannelTabs';
import ChatScreen from '@/screens/ChatScreen';
import MembersScreen from '@/screens/MembersScreen';
import { useAuth } from '@/context/auth';
import { useCommunityStore } from '@/stores/communityStore';
import type { CommunityMember } from '@/types/community';

type DetailTab = 'chat' | 'media' | 'members';

const getUserId = (u: CommunityMember['userId']) => (typeof u === 'string' ? u : u?._id || u?.id || '');

export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<DetailTab>('chat');

  const {
    communities,
    channelsByCommunity,
    currentChannelIdByCommunity,
    messagesByChannel,
    membersByCommunity,
    setCurrentCommunity,
    setCurrentChannel,
    loadCommunityDetail,
    clearUnread,
  } = useCommunityStore();

  const communityId = String(id);
  const community = communities.find((c: any) => c._id === communityId);
  const channels = channelsByCommunity[communityId] || [];
  const activeChannelId = currentChannelIdByCommunity[communityId] || channels[0]?._id;
  const activeChannel = channels.find((c: any) => c._id === activeChannelId);
  const meId = user?.id || (user as any)?._id || '';
  const currentMember = (membersByCommunity[communityId] || []).find((m: any) => getUserId(m.userId) === meId);

  useEffect(() => {
    if (!communityId) return;
    setCurrentCommunity(communityId);
    clearUnread(communityId);
    loadCommunityDetail(communityId);
  }, [communityId, setCurrentCommunity, clearUnread, loadCommunityDetail]);

  const mediaItems = useMemo(() => {
    if (!activeChannelId) return [];
    const key = `${communityId}:${activeChannelId}` as const;
    const msgs = messagesByChannel[key] || [];
    return msgs
      .flatMap((m: any) => m.mediaIds || [])
      .filter((m: any) => typeof m !== 'string' && m?.url)
      .slice(0, 40) as Array<{ url?: string; fileName?: string }>;
  }, [messagesByChannel, activeChannelId, communityId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Image
          source={{
            uri:
              community?.avatarUrl ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(community?.name || 'C')}&background=1D67FF&color=fff`,
          }}
          style={styles.avatar}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>
            {community?.name || 'Community'}
          </Text>
          <Text style={styles.meta}>{community?.memberCount || community?.participants?.length || 0} thành viên</Text>
        </View>
      </View>

      <View style={styles.tabs}>
        {(['chat', 'media', 'members'] as DetailTab[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.tabBtn, tab === item && styles.tabBtnActive]}
            onPress={() => setTab(item)}
          >
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item === 'chat' ? 'Chat' : item === 'media' ? 'Media' : 'Members'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {channels.length > 0 ? (
        <ChannelTabs
          channels={channels}
          activeChannelId={activeChannelId || ''}
          onChange={(channelId) => setCurrentChannel(communityId, channelId)}
        />
      ) : null}

      {tab === 'chat' && activeChannel ? (
        <ChatScreen communityId={communityId} channel={activeChannel} currentMember={currentMember} />
      ) : null}

      {tab === 'media' ? (
        <ScrollView contentContainerStyle={styles.mediaWrap}>
          {mediaItems.map((m, idx) => (
            <Image key={`${m.url}-${idx}`} source={{ uri: m.url }} style={styles.mediaItem} />
          ))}
          {!mediaItems.length ? <Text style={styles.empty}>Chưa có ảnh/file trong kênh này</Text> : null}
        </ScrollView>
      ) : null}

      {tab === 'members' ? (
        <MembersScreen communityId={communityId} currentRole={currentMember?.role || 'member'} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  back: { fontSize: 24, color: '#1D67FF', width: 20 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  name: { fontSize: 17, fontWeight: '700', color: '#111827' },
  meta: { marginTop: 2, color: '#6B7280', fontSize: 12 },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, gap: 8 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10, backgroundColor: '#F3F4F6' },
  tabBtnActive: { backgroundColor: '#DBEAFE' },
  tabText: { color: '#4B5563', fontWeight: '600' },
  tabTextActive: { color: '#1D4ED8' },
  mediaWrap: { padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mediaItem: { width: '31%', aspectRatio: 1, borderRadius: 10, backgroundColor: '#E5E7EB' },
  empty: { color: '#6B7280', padding: 12 },
});

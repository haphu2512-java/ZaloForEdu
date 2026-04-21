import { fetchAPI } from '@/utils/api';
import type {
  Community,
  CommunityChannel,
  CommunityMember,
  CommunityMessage,
  CommunityMessagePage,
} from '@/types/community';

const normalizeId = <T extends { _id?: string; id?: string }>(item: T): T & { _id: string; id: string } => ({
  ...item,
  _id: item._id || item.id || '',
  id: item.id || item._id || '',
});

export async function getMyCommunities(): Promise<Community[]> {
  // Reuse existing conversation list and filter by community type.
  const res = await fetchAPI('/conversations?limit=100');
  const items = (res?.data?.items || [])
    .filter((c: any) => c.type === 'community')
    .map((c: any) => normalizeId(c));
  return items;
}

export async function getCommunityById(communityId: string): Promise<Community> {
  const res = await fetchAPI(`/communities/${communityId}`);
  return normalizeId(res.data);
}

export async function createCommunity(payload: {
  name: string;
  description?: string;
  privacy: 'public' | 'private';
}): Promise<Community> {
  const res = await fetchAPI('/communities', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name,
      privacy: payload.privacy,
      participantIds: [],
      description: payload.description || '',
      joinMode: payload.privacy === 'private' ? 'approval' : 'invite',
    }),
  });
  return normalizeId(res.data);
}

export async function getCommunityChannels(communityId: string): Promise<CommunityChannel[]> {
  const res = await fetchAPI(`/channels/${communityId}`);
  return (res.data || []).map((item: any) => normalizeId(item));
}

export async function getCommunityMessages(params: {
  communityId: string;
  channelId?: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<CommunityMessagePage> {
  const search = new URLSearchParams();
  search.set('limit', String(params.limit || 20));
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.channelId) search.set('channelId', params.channelId);

  const res = await fetchAPI(`/messages/conversation/${params.communityId}?${search.toString()}`);
  return {
    items: (res.data?.items || []).map((item: CommunityMessage) => normalizeId(item)),
    nextCursor: res.data?.nextCursor || null,
    limit: res.data?.limit || params.limit || 20,
  };
}

export async function sendCommunityMessage(payload: {
  conversationId: string;
  channelId?: string | null;
  content?: string;
  mediaIds?: string[];
  type?: 'text' | 'image' | 'file' | 'announcement';
  isPinnedAnnouncement?: boolean;
}): Promise<CommunityMessage> {
  const res = await fetchAPI('/messages/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return normalizeId(res.data);
}

export async function listCommunityMembers(communityId: string): Promise<CommunityMember[]> {
  const detail = await getCommunityById(communityId);
  return (detail.members || []).map((item: any) => normalizeId(item));
}

export async function kickMember(communityId: string, memberId: string): Promise<void> {
  await fetchAPI(`/conversations/${communityId}/members/${memberId}`, { method: 'DELETE' });
}

export async function promoteMemberToAdmin(communityId: string, memberId: string): Promise<void> {
  await fetchAPI(`/conversations/${communityId}/admins/${memberId}/promote`, { method: 'PUT' });
}

export async function disbandCommunity(communityId: string): Promise<void> {
  await fetchAPI(`/communities/${communityId}`, { method: 'DELETE' });
}

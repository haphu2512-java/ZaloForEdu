import { create } from 'zustand';

import type { Community, CommunityChannel, CommunityMember, CommunityMessage } from '@/types/community';
import {
  createCommunity,
  getCommunityById,
  getCommunityChannels,
  getCommunityMessages,
  getMyCommunities,
  listCommunityMembers,
  sendCommunityMessage,
} from '@/services/communityService';
import { connectSocket, getSocket } from '@/utils/socketService';

type ChannelKey = `${string}:${string}`;

type CommunityState = {
  communities: Community[];
  currentCommunityId: string | null;
  currentChannelIdByCommunity: Record<string, string>;
  channelsByCommunity: Record<string, CommunityChannel[]>;
  messagesByChannel: Record<ChannelKey, CommunityMessage[]>;
  nextCursorByChannel: Record<ChannelKey, string | null>;
  membersByCommunity: Record<string, CommunityMember[]>;
  loading: boolean;
  unreadByCommunity: Record<string, number>;
  initSocketDone: boolean;

  loadCommunities: () => Promise<void>;
  loadCommunityDetail: (communityId: string) => Promise<void>;
  setCurrentCommunity: (communityId: string) => void;
  setCurrentChannel: (communityId: string, channelId: string) => void;
  loadMessages: (communityId: string, channelId: string, reset?: boolean) => Promise<void>;
  sendMessage: (payload: {
    conversationId: string;
    channelId: string;
    content?: string;
    mediaIds?: string[];
    type?: 'text' | 'image' | 'file' | 'announcement';
    isPinnedAnnouncement?: boolean;
  }) => Promise<void>;
  loadMembers: (communityId: string) => Promise<void>;
  addIncomingMessage: (communityId: string, channelId: string, message: CommunityMessage) => void;
  connectRealtime: () => Promise<void>;
  clearUnread: (communityId: string) => void;
  createCommunityItem: (payload: { name: string; description?: string; privacy: 'public' | 'private' }) => Promise<Community>;
};

const channelKey = (communityId: string, channelId: string): ChannelKey => `${communityId}:${channelId}`;

const upsertMessage = (messages: CommunityMessage[], incoming: CommunityMessage) => {
  const id = incoming._id || incoming.id;
  if (!id) return messages;
  if (messages.some((m) => (m._id || m.id) === id)) return messages;
  return [incoming, ...messages];
};

export const useCommunityStore = create<CommunityState>((set: any, get: any) => ({
  communities: [],
  currentCommunityId: null,
  currentChannelIdByCommunity: {},
  channelsByCommunity: {},
  messagesByChannel: {},
  nextCursorByChannel: {},
  membersByCommunity: {},
  loading: false,
  unreadByCommunity: {},
  initSocketDone: false,

  loadCommunities: async () => {
    set({ loading: true });
    try {
      const communities = await getMyCommunities();
      set((state: any) => ({
        communities: communities.map((c) => ({
          ...c,
          unreadCount: state.unreadByCommunity[c._id] || c.unreadCount || 0,
        })),
      }));
    } finally {
      set({ loading: false });
    }
  },

  loadCommunityDetail: async (communityId: string) => {
    const [detail, channels] = await Promise.all([
      getCommunityById(communityId),
      getCommunityChannels(communityId),
    ]);
    const fallback = channels.find((c: any) => c.type === 'general')?._id || channels[0]?._id || '';

    set((state: any) => ({
      communities: state.communities.map((c: any) => (c._id === communityId ? { ...c, ...detail } : c)),
      channelsByCommunity: { ...state.channelsByCommunity, [communityId]: channels },
      currentChannelIdByCommunity: {
        ...state.currentChannelIdByCommunity,
        [communityId]: state.currentChannelIdByCommunity[communityId] || fallback,
      },
    }));
  },

  setCurrentCommunity: (communityId: string) => set({ currentCommunityId: communityId }),

  setCurrentChannel: (communityId: string, channelId: string) =>
    set((state: any) => ({
      currentChannelIdByCommunity: {
        ...state.currentChannelIdByCommunity,
        [communityId]: channelId,
      },
    })),

  loadMessages: async (communityId: string, channelId: string, reset = false) => {
    const key = channelKey(communityId, channelId);
    const cursor = reset ? null : get().nextCursorByChannel[key];
    if (!reset && cursor === null && get().messagesByChannel[key]?.length) return;

    const page = await getCommunityMessages({
      communityId,
      channelId,
      cursor,
      limit: 20,
    });

    set((state: any) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [key]: reset
          ? page.items
          : [...(state.messagesByChannel[key] || []), ...page.items.filter((m: any) => !(state.messagesByChannel[key] || []).some((old: any) => old._id === m._id))],
      },
      nextCursorByChannel: {
        ...state.nextCursorByChannel,
        [key]: page.nextCursor,
      },
    }));
  },

  sendMessage: async (payload: {
    conversationId: string;
    channelId: string;
    content?: string;
    mediaIds?: string[];
    type?: 'text' | 'image' | 'file' | 'announcement';
    isPinnedAnnouncement?: boolean;
  }) => {
    const created = await sendCommunityMessage(payload);
    get().addIncomingMessage(payload.conversationId, payload.channelId, created);
  },

  loadMembers: async (communityId: string) => {
    const members = await listCommunityMembers(communityId);
    set((state: any) => ({ membersByCommunity: { ...state.membersByCommunity, [communityId]: members } }));
  },

  addIncomingMessage: (communityId: string, channelId: string, message: CommunityMessage) => {
    const key = channelKey(communityId, channelId);
    const currentCommunityId = get().currentCommunityId;
    const currentChannelId = get().currentChannelIdByCommunity[communityId];
    const isCurrent = currentCommunityId === communityId && currentChannelId === channelId;

    set((state: any) => ({
      messagesByChannel: {
        ...state.messagesByChannel,
        [key]: upsertMessage(state.messagesByChannel[key] || [], message),
      },
      communities: state.communities.map((c: any) =>
        c._id === communityId ? { ...c, latestMessage: message } : c
      ),
      unreadByCommunity: {
        ...state.unreadByCommunity,
        [communityId]: isCurrent ? 0 : (state.unreadByCommunity[communityId] || 0) + 1,
      },
    }));
  },

  connectRealtime: async () => {
    if (get().initSocketDone) return;
    const socket = await connectSocket();
    if (!socket) return;

    socket.on('new_message', (message: CommunityMessage) => {
      const communityId = message.conversationId;
      const channelId = message.channelId || get().currentChannelIdByCommunity[communityId];
      if (!communityId || !channelId) return;
      get().addIncomingMessage(communityId, channelId, message);
    });

    socket.on('announcement', (message: CommunityMessage) => {
      const communityId = message.conversationId;
      const channelId = message.channelId || get().currentChannelIdByCommunity[communityId];
      if (!communityId || !channelId) return;
      get().addIncomingMessage(communityId, channelId, message);
    });

    // Listen for group ownership/admin changes
    socket.on('group_updated', (payload: { conversationId: string; ownerId?: string; adminIds?: string[]; action?: string }) => {
      const { conversationId, ownerId, adminIds } = payload;
      console.log('[Mobile] group_updated:', payload);

      set((state: any) => ({
        communities: state.communities.map((c: any) => {
          if (c._id === conversationId) {
            return {
              ...c,
              ownerId: ownerId || c.ownerId,
              adminIds: adminIds || c.adminIds,
            };
          }
          return c;
        }),
      }));
    });

    set({ initSocketDone: true });
  },

  clearUnread: (communityId: string) =>
    set((state: any) => ({
      unreadByCommunity: { ...state.unreadByCommunity, [communityId]: 0 },
      communities: state.communities.map((c: any) => (c._id === communityId ? { ...c, unreadCount: 0 } : c)),
    })),

  createCommunityItem: async (payload: { name: string; description?: string; privacy: 'public' | 'private' }) => {
    const created = await createCommunity(payload);
    set((state: any) => ({ communities: [created, ...state.communities] }));
    return created;
  },
}));

export const joinCommunityChannelRoom = (communityId: string, channelId: string) => {
  const socket = getSocket();
  if (!socket) return;
  socket.emit('join_conversation', { conversationId: communityId });
  socket.emit('join_community_channel', { communityId, channelId });
};

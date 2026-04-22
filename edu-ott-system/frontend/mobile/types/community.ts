export type CommunityPrivacy = 'public' | 'private';
export type CommunityRole = 'owner' | 'admin' | 'mod' | 'member';
export type CommunityMemberStatus = 'active' | 'banned' | 'pending';
export type CommunityMessageType = 'text' | 'image' | 'file' | 'announcement';

export interface CommunityChannel {
  _id: string;
  id?: string;
  groupId: string;
  name: string;
  type: 'general' | 'announcements' | 'media' | 'custom';
}

export interface CommunityMember {
  _id?: string;
  id?: string;
  groupId: string;
  userId: string | { _id?: string; id?: string; username?: string; avatarUrl?: string };
  role: CommunityRole;
  status: CommunityMemberStatus;
  mutedUntil?: string | null;
  lastActiveAt?: string | null;
}

export interface CommunityMessage {
  _id: string;
  id?: string;
  conversationId: string;
  senderId: string | { _id?: string; id?: string; username?: string; avatarUrl?: string };
  content: string;
  type: CommunityMessageType;
  channelId?: string | null;
  mediaIds?: Array<
    | string
    | {
      _id?: string;
      id?: string;
      url?: string;
      fileName?: string;
      mimeType?: string;
    }
  >;
  isPinnedAnnouncement?: boolean;
  seenBy?: Array<string | { _id?: string; id?: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  _id: string;
  id?: string;
  type: 'community';
  name: string;
  avatarUrl?: string | null;
  privacy: CommunityPrivacy;
  participants: Array<{ _id?: string; id?: string; username?: string; avatarUrl?: string }>;
  memberCount?: number;
  latestMessage?: CommunityMessage | null;
  unreadCount?: number;
  channels?: CommunityChannel[];
  members?: CommunityMember[];
}

export interface CommunityMessagePage {
  items: CommunityMessage[];
  nextCursor: string | null;
  limit: number;
}

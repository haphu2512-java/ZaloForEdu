import type { Conversation, UserInfo } from '../types/chat';
import type { FriendRequest } from '../types/friend';
import { searchUsers } from './searchService';

const DIGIT_ONLY = /\D+/g;

export function normalizeVietnamPhone(input: string): string | null {
  const raw = (input || '').trim();
  if (!raw) return null;

  let digits = raw.replace(DIGIT_ONLY, '');
  if (digits.startsWith('84')) digits = `0${digits.slice(2)}`;
  if (digits.length === 9) digits = `0${digits}`;

  if (!/^0\d{9,10}$/.test(digits)) return null;
  return digits;
}

export function extractPhonesFromText(text: string): string[] {
  const tokens = (text || '')
    .split(/[\s,;\n\r\t|/\\-]+/)
    .map((token) => normalizeVietnamPhone(token))
    .filter((phone): phone is string => !!phone);

  return Array.from(new Set(tokens));
}

export function parseQrPayloadToUserId(input: string): string {
  const value = (input || '').trim();
  if (!value) return '';

  if (value.startsWith('zaloedu://')) {
    const uidMatch = value.match(/[?&]uid=([^&]+)/i);
    if (uidMatch?.[1]) return decodeURIComponent(uidMatch[1]);
  }

  if (value.toUpperCase().startsWith('ZALOEDU:')) {
    return value.slice('ZALOEDU:'.length).trim();
  }

  return value;
}

export async function lookupUsersByPhones(phones: string[]): Promise<UserInfo[]> {
  const uniquePhones = Array.from(new Set(phones.map((p) => normalizeVietnamPhone(p)).filter((p): p is string => !!p)));
  if (uniquePhones.length === 0) return [];

  const results = await Promise.allSettled(
    uniquePhones.map((phone) => searchUsers(phone, null, 5)),
  );

  const users: UserInfo[] = [];
  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    for (const user of result.value?.items || []) {
      const uid = user._id || user.id;
      if (!uid) continue;
      users.push(user);
    }
  }

  const deduped = new Map<string, UserInfo>();
  for (const user of users) {
    const uid = user._id || user.id;
    if (uid && !deduped.has(uid)) deduped.set(uid, user);
  }
  return Array.from(deduped.values());
}

type SuggestionInput = {
  currentUserId: string;
  friends: UserInfo[];
  groups: Conversation[];
  incomingRequests: FriendRequest[];
  outgoingRequests: FriendRequest[];
  syncedContactMatches: UserInfo[];
};

export function computeSmartSuggestions(input: SuggestionInput): UserInfo[] {
  const {
    currentUserId,
    friends,
    groups,
    incomingRequests,
    outgoingRequests,
    syncedContactMatches,
  } = input;

  const friendIds = new Set(friends.map((f) => f._id || f.id).filter(Boolean));
  const incomingIds = new Set(
    incomingRequests
      .map((req) => (typeof req.fromUserId === 'string' ? req.fromUserId : req.fromUserId?._id || req.fromUserId?.id))
      .filter(Boolean),
  );
  const outgoingIds = new Set(
    outgoingRequests
      .map((req) => (typeof req.toUserId === 'string' ? req.toUserId : req.toUserId?._id || req.toUserId?.id))
      .filter(Boolean),
  );

  const scoreMap = new Map<string, { user: UserInfo; score: number }>();
  const upsertScore = (user: UserInfo, delta: number) => {
    const uid = user._id || user.id;
    if (!uid || uid === currentUserId) return;
    if (friendIds.has(uid) || incomingIds.has(uid) || outgoingIds.has(uid)) return;

    const existing = scoreMap.get(uid);
    if (existing) {
      existing.score += delta;
      return;
    }
    scoreMap.set(uid, { user, score: delta });
  };

  for (const group of groups) {
    for (const participant of group.participants || []) {
      upsertScore(participant, 3);
      if (participant.isOnline) upsertScore(participant, 1);
    }
  }

  for (const contactUser of syncedContactMatches) {
    upsertScore(contactUser, 5);
    if (contactUser.isOnline) upsertScore(contactUser, 1);
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score || (a.user.username || '').localeCompare(b.user.username || '', 'vi'))
    .map((entry) => entry.user)
    .slice(0, 20);
}

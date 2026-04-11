import { fetchAPI } from './api';
import type { User } from '../types/auth';

const USERS_ENDPOINT = '/users';

type BlockAction = 'block' | 'unblock';

export async function getUserById(userId: string): Promise<User> {
  const res = await fetchAPI(`${USERS_ENDPOINT}/${userId}`);
  return res.data;
}

export async function deleteMyAccount(userId: string): Promise<void> {
  await fetchAPI(`${USERS_ENDPOINT}/${userId}`, {
    method: 'DELETE',
  });
}

export async function blockOrUnblockUser(
  targetUserId: string,
  action: BlockAction = 'block',
): Promise<{ blockedUsers: string[]; action: BlockAction }> {
  const res = await fetchAPI(`${USERS_ENDPOINT}/block/${targetUserId}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
  return res.data;
}

export async function getBlockedUsers(): Promise<User[]> {
  const res = await fetchAPI(`${USERS_ENDPOINT}/me/blocked`);
  return res.data?.blockedUsers || [];
}

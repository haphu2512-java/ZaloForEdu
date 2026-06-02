import { fetchAPI } from './api';

const SOCIAL = '/social';

// ==================== POSTS ====================

export async function createPost(payload: {
  content: string;
  mediaUrls?: { url: string; type: 'image' | 'video' }[];
  privacy?: 'public' | 'friends' | 'private';
}): Promise<any> {
  const res = await fetchAPI(`${SOCIAL}/posts`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getFeed(cursor?: string | null, limit = 20): Promise<any> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(`${SOCIAL}/posts/feed?${params.toString()}`);
  return res.data;
}

export async function getUserPosts(userId: string, cursor?: string | null, limit = 20): Promise<any> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.append('cursor', cursor);
  const res = await fetchAPI(`${SOCIAL}/posts/user/${userId}?${params.toString()}`);
  return res.data;
}

export async function getPostById(postId: string): Promise<any> {
  const res = await fetchAPI(`${SOCIAL}/posts/${postId}`);
  return res.data;
}

export async function updatePost(postId: string, payload: { content?: string; privacy?: string }): Promise<any> {
  const res = await fetchAPI(`${SOCIAL}/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function deletePost(postId: string): Promise<void> {
  await fetchAPI(`${SOCIAL}/posts/${postId}`, { method: 'DELETE' });
}

// ==================== COMMENTS ====================

export async function createComment(postId: string, payload: { content: string; parentId?: string }): Promise<any> {
  const res = await fetchAPI(`${SOCIAL}/posts/${postId}/comments`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getComments(postId: string, cursor?: string | null, parentId?: string | null): Promise<any> {
  const params = new URLSearchParams({ limit: '30' });
  if (cursor) params.append('cursor', cursor);
  if (parentId) params.append('parentId', parentId);
  const res = await fetchAPI(`${SOCIAL}/posts/${postId}/comments?${params.toString()}`);
  return res.data;
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await fetchAPI(`${SOCIAL}/posts/${postId}/comments/${commentId}`, { method: 'DELETE' });
}

// ==================== REACTIONS ====================

export async function toggleReaction(payload: {
  targetType: 'post' | 'comment';
  targetId: string;
  emoji: string | null;
}): Promise<any> {
  const res = await fetchAPI(`${SOCIAL}/reactions`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data;
}

export async function getReactions(targetType: string, targetId: string): Promise<any> {
  const res = await fetchAPI(`${SOCIAL}/reactions/${targetType}/${targetId}`);
  return res.data;
}

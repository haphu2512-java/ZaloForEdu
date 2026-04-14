/**
 * pollService.ts
 * Feature 1: Bình chọn (Polls) - API service cho Mobile
 */
import { fetchAPI } from './api';

export interface PollOption {
  _id: string;
  text: string;
  votes: string[] | number; // Array of userIds hoặc count (nếu anonymous)
}

export interface Poll {
  _id: string;
  conversationId: string;
  createdBy: { _id: string; username: string; avatarUrl?: string };
  question: string;
  options: PollOption[];
  isMultipleChoice: boolean;
  isAnonymous: boolean;
  allowAddOptions: boolean;
  isClosed: boolean;
  expiredAt?: string | null;
  createdAt: string;
}

export interface CreatePollPayload {
  conversationId: string;
  question: string;
  options: string[];
  isMultipleChoice?: boolean;
  isAnonymous?: boolean;
  allowAddOptions?: boolean;
  expiredAt?: string | null;
}

/** Tạo bình chọn mới */
export const createPoll = async (payload: CreatePollPayload): Promise<Poll> => {
  const res = await fetchAPI('/polls', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
};

/** Lấy danh sách polls trong nhóm */
export const listPolls = async (conversationId: string, limit = 20): Promise<Poll[]> => {
  const params = new URLSearchParams({ conversationId, limit: String(limit) });
  const res = await fetchAPI(`/polls?${params.toString()}`);
  return res.data.items;
};

/** Lấy chi tiết 1 poll */
export const getPoll = async (pollId: string): Promise<Poll> => {
  const res = await fetchAPI(`/polls/${pollId}`);
  return res.data;
};

/** Vote bình chọn */
export const votePoll = async (pollId: string, optionIndexes: number[]): Promise<Poll> => {
  const res = await fetchAPI(`/polls/${pollId}/vote`, {
    method: 'POST',
    body: JSON.stringify({ optionIndexes }),
  });
  return res.data;
};

/** Đóng bình chọn (Admin/Creator) */
export const closePoll = async (pollId: string): Promise<Poll> => {
  const res = await fetchAPI(`/polls/${pollId}/close`, {
    method: 'PUT',
  });
  return res.data;
};

import { fetchAPI } from './api';

export interface AskChatbotResponse {
  reply: string;
  model: string;
  createdAt: string;
}

export interface ChatbotTurn {
  role: 'user' | 'assistant';
  content: string;
}

export async function askChatbot(message: string, history: ChatbotTurn[] = []): Promise<AskChatbotResponse> {
  const res = await fetchAPI('/chatbot/ask', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return res.data;
}

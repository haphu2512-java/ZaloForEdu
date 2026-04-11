import { fetchAPI } from './api';

export interface AskChatbotResponse {
  reply: string;
  model: string;
  createdAt: string;
}

export async function askChatbot(message: string): Promise<AskChatbotResponse> {
  const res = await fetchAPI('/chatbot/ask', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
  return res.data;
}

const axios = require('axios');

const env = require('../config/env');
const ApiError = require('../utils/apiError');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_HISTORY_ITEMS = 12;

const clamp = (value, min, max) => {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
};

const normalizeHistory = (history = []) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && typeof item.content === 'string')
    .filter((item) => item.role === 'user' || item.role === 'assistant')
    .slice(-MAX_HISTORY_ITEMS)
    .map((item) => ({
      role: item.role,
      content: item.content.trim().slice(0, 4000),
    }))
    .filter((item) => item.content.length > 0);
};

const buildContents = ({ message, history }) => {
  const normalizedHistory = normalizeHistory(history);
  const turns = normalizedHistory.map((item) => ({
    role: item.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: item.content }],
  }));

  turns.push({
    role: 'user',
    parts: [{ text: message.trim() }],
  });

  return turns;
};

const extractGeminiText = (payload) => {
  const candidates = payload?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return '';

  const first = candidates[0];
  const parts = first?.content?.parts;
  if (!Array.isArray(parts)) return '';

  const text = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('\n')
    .trim();

  return text;
};

const askGemini = async ({ message, history = [] }) => {
  if (!env.geminiApiKey) {
    throw new ApiError(500, 'CHATBOT_NOT_CONFIGURED', 'GEMINI_API_KEY is missing');
  }

  const model = env.chatbotModel || 'gemini-2.5-flash';
  const url = `${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`;

  const temperature = clamp(env.chatbotTemperature, 0, 2);
  const maxOutputTokens = clamp(env.chatbotMaxOutputTokens, 128, 4096);

  const response = await axios.post(
    url,
    {
      systemInstruction: {
        parts: [{ text: env.chatbotSystemPrompt }],
      },
      contents: buildContents({ message, history }),
      generationConfig: {
        temperature,
        maxOutputTokens,
      },
    },
    {
      params: { key: env.geminiApiKey },
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  const reply = extractGeminiText(response.data);
  if (!reply) {
    throw new ApiError(502, 'CHATBOT_EMPTY_RESPONSE', 'Gemini returned an empty response');
  }

  return {
    reply,
    model,
    createdAt: new Date().toISOString(),
  };
};

module.exports = {
  askGemini,
};

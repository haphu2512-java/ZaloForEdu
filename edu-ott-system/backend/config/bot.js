const env = require('./env');

// Bot configuration
module.exports = {
  BOT_NAME: process.env.BOT_NAME || 'ZaloBot',
  // username used when creating/finding the bot user in DB (lowercase, no space)
  BOT_USERNAME: process.env.BOT_USERNAME || (process.env.BOT_NAME || 'ZaloBot').toLowerCase().replace(/\s+/g, ''),
  // Optional: set a fixed user id for bot (recommended to seed in production)
  BOT_USER_ID: process.env.BOT_USER_ID || null,
  // System message template used on failures
  BOT_FALLBACK_MESSAGE: process.env.BOT_FALLBACK_MESSAGE || 'Xin lỗi, tôi đang gặp sự cố khi xử lý yêu cầu.',
  // Avatar URL to use for the bot user and client fallbacks
  BOT_AVATAR: process.env.BOT_AVATAR || 'https://res.cloudinary.com/da99vmfxr/image/upload/v1780185665/chatbot_e2zcuy.png',
  // Expose groq config to services
  groq: {
    apiKey: env.groqApiKey,
    model: env.groqModel,
    temperature: env.groqTemperature,
    maxOutputTokens: env.groqMaxOutputTokens,
  },
};

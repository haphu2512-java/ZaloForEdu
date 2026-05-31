// Frontend bot configuration for mention/autocomplete
// Use Vite env (import.meta.env) — `process` is not available in browser.
const _env = typeof import.meta !== 'undefined' ? import.meta.env : {};
export const BOT_NAME = _env.VITE_BOT_NAME || 'ZaloBot';
export const BOT_USERNAME = (_env.VITE_BOT_USERNAME || BOT_NAME).toString();
export const BOT_ID = 'zalobot'; // client-side stable id for mention list
export const BOT_AVATAR = _env.VITE_BOT_AVATAR || 'https://res.cloudinary.com/da99vmfxr/image/upload/v1780185665/chatbot_e2zcuy.png';

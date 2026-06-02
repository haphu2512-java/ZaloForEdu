const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Poll = require('../models/Poll');
const Reminder = require('../models/Reminder');
const env = require('../config/env');
const botConfig = require('../config/bot');
const groqProvider = require('./providers/groqProvider');
const redisClient = require('./redisClient');
const ApiError = require('../utils/apiError');
const bcrypt = require('bcryptjs');

// Lazy-require to avoid circular dependency issues
let socketService;

// =============================================================================
// AGENT CONFIG
// =============================================================================

const AGENT_CONFIDENCE = parseFloat(process.env.AGENT_CONFIDENCE || '0.8');

// =============================================================================
// BOT USER
// =============================================================================

const findOrCreateBotUser = async () => {
  if (botConfig.BOT_USER_ID) {
    const byId = await User.findById(botConfig.BOT_USER_ID);
    if (byId) {
      if (botConfig.BOT_AVATAR && (!byId.avatarUrl || byId.avatarUrl === '')) {
        byId.avatarUrl = botConfig.BOT_AVATAR;
        await byId.save();
      }
      return byId;
    }
  }

  const byUsername = await User.findOne({ username: botConfig.BOT_USERNAME });
  if (byUsername) {
    if (botConfig.BOT_AVATAR && (!byUsername.avatarUrl || byUsername.avatarUrl === '')) {
      byUsername.avatarUrl = botConfig.BOT_AVATAR;
      await byUsername.save();
    }
    return byUsername;
  }

  const randomSecret = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const passwordHash = bcrypt.hashSync(randomSecret, 8);

  const botUser = new User({
    username: botConfig.BOT_USERNAME,
    fullName: botConfig.BOT_NAME,
    passwordHash,
    isSystem: true,
    avatarUrl: botConfig.BOT_AVATAR || '',
  });
  await botUser.save();
  return botUser;
};

// =============================================================================
// AI GENERATION
// =============================================================================

const buildPrompt = ({ triggerMessage, history = [] }) => {
  const lines = [];
  lines.push('You are a helpful assistant in a group chat. When users mention the assistant (e.g., @ZaloBot), reply concisely in Vietnamese if the message is Vietnamese, otherwise respond in the same language.');
  lines.push('Conversation context:');
  for (const h of history.slice(-8)) {
    lines.push(`${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`);
  }
  lines.push(`User: ${triggerMessage.content}`);
  lines.push('Assistant:');
  return lines.join('\n');
};

const generateReply = async ({ conversationId, triggerMessage, history = [] }) => {
  const prompt = buildPrompt({ triggerMessage, history });
  const text = await groqProvider.generate({ prompt, maxTokens: env.groqMaxOutputTokens, temperature: env.groqTemperature, model: env.groqModel });
  return text;
};

const generateSummary = async ({ conversationId, triggerMessage }) => {
  const botUser = await findOrCreateBotUser();

  const msgs = await Message.find({
    conversationId,
    type: 'text',
    senderId: { $ne: botUser._id },
    isRecalled: { $ne: true },
  })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('senderId', 'username fullName')
    .lean();

  if (!msgs || msgs.length === 0) return null;

  const ordered = msgs.reverse();
  const lines = ordered.map((m) => {
    const senderName = (m.senderId && (m.senderId.username || m.senderId._id)) || 'Người dùng';
    const content = (m.content || '').trim();
    return `${senderName}:\n${content}`;
  });

  const messagesBlock = lines.join('\n\n');

  // Lấy câu hỏi gốc của user (đã strip @ZaloBot) để AI hiểu user đang hỏi gì
  const userRequest = (triggerMessage?.content || '')
    .replace(/@\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const promptLines = [];
  promptLines.push('Bạn là một trợ lý tóm tắt cuộc trò chuyện.');
  promptLines.push(`Yêu cầu của người dùng: "${userRequest}"`);
  promptLines.push('');
  promptLines.push('Hướng dẫn:');
  promptLines.push('- Nếu yêu cầu hỏi về một người cụ thể (ví dụ: "xuân vinh chia sẻ gì", "thiện nói gì"), chỉ tóm tắt các tin nhắn của người đó, bỏ qua người khác.');
  promptLines.push('- Nếu yêu cầu là tóm tắt chung ("tóm tắt", "tóm tắt cuộc trò chuyện"), tóm tắt nội dung chính của toàn bộ cuộc trò chuyện.');
  promptLines.push('- Trả lời bằng tiếng Việt, ngắn gọn, rõ ràng.');
  promptLines.push('');
  promptLines.push('Dưới đây là các tin nhắn (cũ → mới):');
  promptLines.push(messagesBlock);
  promptLines.push('\nKết quả:');

  const prompt = promptLines.join('\n');
  const text = await groqProvider.generate({ prompt, maxTokens: env.groqMaxOutputTokens, temperature: env.groqTemperature, model: env.groqModel });
  return text;
};

const sendBotMessage = async ({ conversationId, text }) => {
  const botUser = await findOrCreateBotUser();
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const message = await Message.create({
    conversationId,
    senderId: botUser._id,
    content: text,
    type: 'text',
    deliveredTo: conversation.participants || [],
    seenBy: [],
  });

  await message.populate('senderId', 'username avatarUrl fullName');

  // Ensure sender avatar is present on the message object for clients
  if (message.senderId && (!message.senderId.avatarUrl || message.senderId.avatarUrl === '') && botConfig.BOT_AVATAR) {
    message.senderId.avatarUrl = botConfig.BOT_AVATAR;
  }

  try {
    socketService = socketService || require('./socketService');
    if (socketService && typeof socketService.emitToCommunityChannel === 'function') {
      socketService.emitToCommunityChannel(conversationId.toString(), null, 'new_message', message);
    }
    if (socketService && typeof socketService.emitConversationUpdated === 'function') {
      await socketService.emitConversationUpdated(conversationId.toString(), {
        conversationId,
        latestMessage: message,
      });
    }
  } catch (e) {
    console.error('aiService: socket emit failed', e);
  }

  return message;
};

// =============================================================================
// AGENT: extractAction
//
// Một lần gọi AI duy nhất để:
// 1. Nhận diện intent (create_poll / create_reminder / summary / chat)
// 2. Trích xuất tất cả thông tin có thể từ tin nhắn
// 3. Đánh dấu field nào còn null (thực sự thiếu) để hỏi lại
//
// Schema trả về:
// {
//   "action": "create_poll" | "create_reminder" | "summary" | "chat",
//   "confidence": 0.0 - 1.0,
//   "data": {
//     // create_poll:
//     "title": string | null,
//     "options": string[] | null,   // null nếu chưa có, [] không hợp lệ
//
//     // create_reminder:
//     "title": string | null,
//     "datetime_iso": string | null  // ISO 8601, null nếu không đủ thông tin
//   },
//   "missing": string[]   // các field thực sự thiếu, VD: ["options"], ["datetime_iso"]
// }
// =============================================================================

const extractAction = async ({ triggerMessage, history = [] }) => {
  // Luôn dùng giờ Việt Nam (UTC+7) để AI tính đúng ngày/giờ
  const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const now = nowVN.toISOString().replace('Z', '+07:00');

  const schema = `{
  "action": "create_poll" | "create_reminder" | "summary" | "chat",
  "confidence": <number 0.0-1.0>,
  "data": {
    "title": <string hoặc null nếu thiếu>,
    "options": <mảng string hoặc null nếu thiếu - chỉ dùng cho create_poll>,
    "datetime_iso": <ISO 8601 string hoặc null nếu thiếu - chỉ dùng cho create_reminder>
  },
  "missing": <mảng tên các field còn null, ví dụ ["options"] hoặc ["datetime_iso"] hoặc []>
}`;

  const rules = `
RULES (quan trọng, đọc kỹ từng rule):

[datetime_iso]
- Chỉ điền datetime_iso nếu tin nhắn có GIỜ CỤ THỂ (ví dụ: 9h, 14:30, 3 giờ chiều).
- Ví dụ HỢP LỆ: "lúc 9h", "chiều nay 3h", "mai 8 giờ sáng", "thứ 2 lúc 14h", "lát 9h".
- Ví dụ KHÔNG HỢP LỆ → datetime_iso = null: "ngày mai" (không có giờ), "tối nay" (không rõ giờ), "đi cà phê" (không có gì).
- Nếu có giờ nhưng không có ngày → mặc định ngày hôm nay.
- Nếu chỉ có ngày mà KHÔNG có giờ → datetime_iso = null, đưa "datetime_iso" vào missing[].
- TUYỆT ĐỐI không tự bịa giờ nếu user không đề cập.

[title]
- Để null chỉ khi nội dung/tiêu đề hoàn toàn vắng mặt.

[options - chỉ cho create_poll]
- Để null nếu user không liệt kê bất kỳ lựa chọn nào. Cần ít nhất 2 lựa chọn mới hợp lệ.

[missing[]]
- Liệt kê tên field nào còn null. Field đã có giá trị thì KHÔNG đưa vào đây.

[confidence]
- >= 0.85 nếu action rõ ràng.`;

  const contextLines = history.slice(-10).map((h) => {
    const who = (h.senderId && (h.senderId.username || String(h.senderId))) || 'User';
    return `${who}: ${h.content || ''}`;
  });

  const prompt = [
    `Thời điểm hiện tại: ${now}`,
    `Bạn là AI assistant phân tích tin nhắn trong group chat.`,
    schema,
    rules,
    `\nLịch sử hội thoại gần nhất (cũ → mới):`,
    ...contextLines,
    `\nTin nhắn cần phân tích: "${triggerMessage.content}"`,
    `\nTrả về JSON theo đúng schema trên, không giải thích thêm:`,
  ].join('\n');

  const raw = await groqProvider.generate({ prompt, maxTokens: 400, temperature: 0.0, model: env.groqModel });

  try {
    const cleaned = raw.trim().replace(/^```json|^```|```$/gm, '').trim();
    const parsed = JSON.parse(cleaned);
    // Normalize
    if (!Array.isArray(parsed.missing)) parsed.missing = [];
    if (!parsed.data) parsed.data = {};
    return parsed;
  } catch (e) {
    return { action: 'chat', confidence: 0.0, data: {}, missing: [], raw };
  }
};

// Hỏi lại user về field còn thiếu — gọi AI để tạo câu hỏi tự nhiên
const askFollowup = async ({ triggerMessage, pending }) => {
  const missingField = pending.nextField;
  const action = pending.action;

  const fieldLabel = {
    title: action === 'CREATE_POLL' ? 'tiêu đề bình chọn' : 'nội dung nhắc hẹn',
    options: 'các lựa chọn cho bình chọn (ít nhất 2)',
    datetime_iso: 'thời gian muốn nhắc',
  }[missingField] || missingField;

  const prompt = [
    `Bạn là trợ lý trong group chat. User vừa yêu cầu ${action === 'CREATE_POLL' ? 'tạo bình chọn' : 'tạo nhắc hẹn'}.`,
    `Thông tin đã có: ${JSON.stringify(pending.collected)}`,
    `Thông tin còn thiếu: ${fieldLabel}`,
    `Hãy hỏi user một câu ngắn gọn, tự nhiên bằng tiếng Việt để lấy thông tin còn thiếu đó.`,
    `Chỉ trả về câu hỏi, không giải thích.`,
  ].join('\n');

  const text = await groqProvider.generate({ prompt, maxTokens: 80, temperature: 0.3, model: env.groqModel });
  return (text || '').trim();
};

// =============================================================================
// PENDING ACTION STORE
// =============================================================================

const inMemory = new Map();

const makeKey = (conversationId, userId) => `pending:conv:${conversationId}:user:${userId}`;

const setPending = async (conversationId, userId, obj, ttlSeconds = 600) => {
  const key = makeKey(conversationId, userId);
  const payload = { id: `${Date.now()}-${Math.floor(Math.random() * 1000000)}`, createdAt: Date.now(), ...obj };
  const client = redisClient.getRedis();
  if (redisClient.isRedisAvailable()) {
    try {
      await client.set(key, JSON.stringify(payload), { EX: ttlSeconds });
      return payload;
    } catch (e) {
      // fallback to memory
    }
  }
  if (inMemory.has(key)) clearTimeout(inMemory.get(key).timeoutHandle);
  const timeoutHandle = setTimeout(() => inMemory.delete(key), ttlSeconds * 1000);
  inMemory.set(key, { payload, timeoutHandle });
  return payload;
};

const getPending = async (conversationId, userId) => {
  const key = makeKey(conversationId, userId);
  const client = redisClient.getRedis();
  if (redisClient.isRedisAvailable()) {
    try {
      const v = await client.get(key);
      if (!v) return null;
      return JSON.parse(v);
    } catch (e) {
      // fallback
    }
  }
  const entry = inMemory.get(key);
  return entry ? entry.payload : null;
};

const updatePending = async (conversationId, userId, patch, ttlSeconds = 600) => {
  const current = await getPending(conversationId, userId);
  if (!current) throw new ApiError(404, 'PENDING_NOT_FOUND', 'Pending action not found');
  const updated = { ...current, ...patch, updatedAt: Date.now() };
  return setPending(conversationId, userId, updated, ttlSeconds);
};

const deletePending = async (conversationId, userId) => {
  const key = makeKey(conversationId, userId);
  const client = redisClient.getRedis();
  if (redisClient.isRedisAvailable()) {
    try {
      await client.del(key);
    } catch (e) {
      // ignore
    }
  }
  const entry = inMemory.get(key);
  if (entry) {
    clearTimeout(entry.timeoutHandle);
    inMemory.delete(key);
  }
};

// =============================================================================
// AUTOMATION HELPERS
// =============================================================================

const createPollFromBot = async ({ conversationId, botUser, title, options }) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const isAllowed = conversation.settings?.canMembersCreatePolls !== false;
  if (!isAllowed) throw new ApiError(403, 'FORBIDDEN', 'Poll creation not allowed in this conversation');

  const poll = await Poll.create({
    conversationId,
    createdBy: botUser._id,
    question: (title || 'Bình chọn do bot tạo').trim(),
    options: (options || []).map((text) => ({ text: text.trim(), votes: [] })),
    isMultipleChoice: false,
    isAnonymous: false,
    allowAddOptions: false,
    expiredAt: null,
  });

  await poll.populate('createdBy', 'username avatarUrl');

  const message = await Message.create({
    conversationId,
    senderId: botUser._id,
    type: 'poll',
    pollId: poll._id,
    content: `Bình chọn: ${poll.question}`,
  });
  await message.populate('senderId', 'username avatarUrl');
  await message.populate({ path: 'pollId', populate: { path: 'createdBy', select: 'username avatarUrl' } });

  socketService = socketService || require('./socketService');
  await socketService.emitToConversation(conversationId.toString(), 'new_message', message);
  await socketService.emitConversationUpdated(conversationId.toString(), { conversationId, latestMessage: message });

  const senderName = botUser.fullName || botUser.username;
  const sysMsg = await Message.create({
    conversationId,
    senderId: botUser._id,
    content: `${senderName} đã tạo cuộc bình chọn: "${poll.question}"`,
    type: 'system',
    pollId: poll._id,
  });
  await sysMsg.populate('senderId', 'username avatarUrl fullName');
  await socketService.emitToConversation(conversationId.toString(), 'new_message', sysMsg);
  await socketService.emitConversationUpdated(conversationId.toString(), { conversationId, latestMessage: sysMsg });

  return { poll, message };
};

const createReminderFromBot = async ({ conversationId, botUser, title, remindAt }) => {
  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const isAllowed = conversation.settings?.canMembersCreateReminders !== false;
  if (!isAllowed) throw new ApiError(403, 'FORBIDDEN', 'Reminder creation not allowed in this conversation');

  const reminder = await Reminder.create({
    conversationId,
    title: title || 'Nhắc hẹn do bot tạo',
    remindAt,
    createdBy: botUser._id,
    participants: [],
  });

  await reminder.populate('createdBy', 'username avatarUrl');
  await reminder.populate('participants', 'username avatarUrl');

  socketService = socketService || require('./socketService');
  await socketService.emitToConversation(conversationId.toString(), 'reminder_created', reminder);

  const senderInfo = { _id: botUser._id, username: botUser.username, avatarUrl: botUser.avatarUrl };
  const msg = await Message.create({
    conversationId,
    senderId: botUser._id,
    content: `${botUser.username} đã tạo nhắc hẹn "${reminder.title}"`,
    type: 'system_reminder',
    reminderId: reminder._id,
  });
  await msg.populate('reminderId', 'title remindAt');
  await socketService.emitConversationUpdated(conversationId.toString(), {
    conversationId: conversationId.toString(),
    latestMessage: { ...msg.toObject(), senderId: senderInfo },
  });

  return { reminder };
};

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  // AI generation
  generateReply,
  generateSummary,
  sendBotMessage,
  findOrCreateBotUser,
  // Agent
  extractAction,
  askFollowup,
  AGENT_CONFIDENCE,
  // Pending action store
  setPending,
  getPending,
  updatePending,
  deletePending,
  // Automation
  createPollFromBot,
  createReminderFromBot,
};
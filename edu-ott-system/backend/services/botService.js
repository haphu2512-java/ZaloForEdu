const Message = require('../models/Message');
const botConfig = require('../config/bot');
const aiService = require('./aiService');
const { parseMentions } = require('./messageService');

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Strip tất cả @mention khỏi nội dung để lấy phần text thuần túy.
 * VD: "@ZaloBot có và không" → "có và không"
 */
const stripMentions = (text) => {
  return (text || '').replace(/@\S+/g, '').replace(/\s+/g, ' ').trim();
};

// =============================================================================
// HELPERS: xử lý pending khi user trả lời câu hỏi của bot
// =============================================================================

const handlePendingPoll = async (messageDoc, pending) => {
  const field = pending.nextField;
  // FIX: strip @mentions khỏi reply của user trước khi xử lý
  const userReply = stripMentions(messageDoc.content?.trim() || '');
  const collected = { ...pending.collected };

  if (field === 'title') {
    collected.title = userReply;
  } else if (field === 'options') {
    // Parse options: mỗi dòng 1 option, hoặc phân cách bằng dấu phẩy
    const lines = userReply.split('\n').map(l => l.replace(/^[-*\d\.\)\s]+/, '').trim()).filter(Boolean);
    if (lines.length === 1 && lines[0].includes(',')) {
      collected.options = lines[0].split(',').map(s => s.trim()).filter(Boolean);
    } else {
      collected.options = lines;
    }
  }

  const missingTitle = !collected.title || !collected.title.trim();
  const missingOptions = !Array.isArray(collected.options) || collected.options.length < 2;

  if (missingTitle) {
    await aiService.updatePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString(), { collected, nextField: 'title' });
    const q = await aiService.askFollowup({ triggerMessage: messageDoc, pending: { action: 'CREATE_POLL', collected, nextField: 'title' } });
    await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: q || 'Bình chọn này có tiêu đề là gì?' });
    return;
  }

  if (missingOptions) {
    await aiService.updatePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString(), { collected, nextField: 'options' });
    const q = await aiService.askFollowup({ triggerMessage: messageDoc, pending: { action: 'CREATE_POLL', collected, nextField: 'options' } });
    await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: q || 'Vui lòng cung cấp ít nhất 2 lựa chọn (mỗi dòng 1 lựa chọn hoặc cách nhau bằng dấu phẩy).' });
    return;
  }

  // Đủ thông tin → tạo poll
  try {
    const botUser = await aiService.findOrCreateBotUser();
    await aiService.createPollFromBot({ conversationId: messageDoc.conversationId, botUser, title: collected.title, options: collected.options });
    await aiService.deletePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString());
  } catch (e) {
    console.error('createPollFromBot error', e);
    await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: `Không thể tạo bình chọn: ${e.message || 'Lỗi không xác định'}` });
    await aiService.deletePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString());
  }
};

const handlePendingReminder = async (messageDoc, pending) => {
  const field = pending.nextField;
  // FIX: strip @mentions khỏi reply của user
  const userReply = stripMentions(messageDoc.content?.trim() || '');
  const collected = { ...pending.collected };

  if (field === 'datetime_iso') {
    collected.datetime_iso = userReply; // sẽ được re-parse bởi AI ở bước tiếp
  } else if (field === 'title') {
    collected.title = userReply;
  }

  // Nếu user vừa cung cấp datetime dưới dạng text tự nhiên, dùng AI parse lại
  if (field === 'datetime_iso' && userReply) {
    try {
      const parsed = await aiService.extractAction({
        triggerMessage: { content: userReply },
        history: [],
      });
      if (parsed.data?.datetime_iso) {
        collected.datetime_iso = parsed.data.datetime_iso;
      }
    } catch (e) {
      // giữ nguyên text, sẽ báo lỗi khi tạo nếu không parse được
    }
  }

  const missingDatetime = !collected.datetime_iso;
  const missingTitle = !collected.title || !collected.title.trim();

  if (missingDatetime) {
    await aiService.updatePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString(), { collected, nextField: 'datetime_iso' });
    const q = await aiService.askFollowup({ triggerMessage: messageDoc, pending: { action: 'CREATE_REMINDER', collected, nextField: 'datetime_iso' } });
    await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: q || 'Bạn muốn nhắc vào thời gian nào?' });
    return;
  }

  if (missingTitle) {
    await aiService.updatePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString(), { collected, nextField: 'title' });
    const q = await aiService.askFollowup({ triggerMessage: messageDoc, pending: { action: 'CREATE_REMINDER', collected, nextField: 'title' } });
    await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: q || 'Nội dung nhắc hẹn là gì?' });
    return;
  }

  // Đủ thông tin → tạo reminder
  try {
    let dtIso = collected.datetime_iso;
    // Gắn timezone VN nếu AI trả về naive ISO (không có Z hay +07:00)
    if (dtIso && !/[Zz]|[+-]\d{2}:\d{2}$/.test(dtIso)) {
      dtIso = dtIso + '+07:00';
    }
    const remindAt = new Date(dtIso);
    if (isNaN(remindAt.getTime())) throw new Error('Thời gian không hợp lệ');
    const botUser = await aiService.findOrCreateBotUser();
    const res = await aiService.createReminderFromBot({ conversationId: messageDoc.conversationId, botUser, title: collected.title, remindAt });
    await aiService.deletePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString());
  } catch (e) {
    console.error('createReminderFromBot error', e);
    await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: `Không thể tạo nhắc hẹn: ${e.message || 'Lỗi không xác định'}` });
    await aiService.deletePending(messageDoc.conversationId.toString(), messageDoc.senderId.toString());
  }
};

// =============================================================================
// MAIN: tryTriggerBot
// =============================================================================

const tryTriggerBot = async (messageDoc, conversation) => {
  try {
    const convId = messageDoc.conversationId.toString();
    const userId = messageDoc.senderId.toString();

    // Bỏ qua system messages sớm
    if (messageDoc.type && messageDoc.type.startsWith('system')) return;

    // Tránh bot tự reply chính mình
    const botUser = await aiService.findOrCreateBotUser();
    if (botUser && messageDoc.senderId.toString() === botUser._id.toString()) return;

    // --- Bước 1: Kiểm tra pending action (user đang trả lời câu hỏi của bot) ---
    // FIX: pending flow KHÔNG cần mention bot — user đang trong giữa cuộc hội thoại
    const pending = await aiService.getPending(convId, userId);
    if (pending) {
      if (pending.action === 'CREATE_POLL') {
        await handlePendingPoll(messageDoc, pending);
      } else if (pending.action === 'CREATE_REMINDER') {
        await handlePendingReminder(messageDoc, pending);
      }
      // Unknown pending action → bỏ qua
      return;
    }

    // --- Bước 2: Kiểm tra có mention bot không (chỉ khi KHÔNG có pending) ---
    const parsed = await parseMentions(messageDoc.content, conversation);
    if (!parsed.mentionBot) return;

    // --- Bước 3: Dùng AI phân tích tin nhắn — 1 lần call duy nhất ---
    const recent = await Message.find({ conversationId: messageDoc.conversationId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    let result;
    try {
      result = await aiService.extractAction({
        triggerMessage: messageDoc,
        history: recent.reverse(),
      });
    } catch (e) {
      console.error('extractAction failed', e);
      result = { action: 'chat', confidence: 0, data: {}, missing: [] };
    }

    const { action, confidence, data = {}, missing = [] } = result;
    const threshold = aiService.AGENT_CONFIDENCE || 0.8;

    // Bình chọn và nhắc hẹn chỉ hoạt động trong nhóm/community, không hỗ trợ chat 1-1
    const isDirectChat = conversation.type === 'direct';

    // --- Bước 4: Xử lý theo action ---

    if (action === 'summary') {
      const summaryText = await aiService.generateSummary({ conversationId: messageDoc.conversationId, triggerMessage: messageDoc });
      if (summaryText) await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: summaryText });
      return;
    }

    if (action === 'create_poll' && confidence >= threshold) {
      if (isDirectChat) {
        await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: 'Tính năng tạo bình chọn chỉ khả dụng trong nhóm chat.' });
        return;
      }
      const title = (data.title || '').trim() || null;
      const options = Array.isArray(data.options) && data.options.length >= 2
        ? data.options.map(o => (o || '').trim()).filter(Boolean)
        : null;

      // Nếu đủ thông tin → tạo luôn
      if (title && options) {
        try {
          await aiService.createPollFromBot({ conversationId: messageDoc.conversationId, botUser, title, options });
        } catch (e) {
          console.error('createPollFromBot failed', e);
          await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: `Không thể tạo bình chọn: ${e.message}` });
        }
        return;
      }

      // Thiếu thông tin → lưu pending, hỏi field đầu tiên còn thiếu
      const collected = { title, options };
      const nextField = missing[0] || (!title ? 'title' : 'options');
      await aiService.setPending(convId, userId, { action: 'CREATE_POLL', collected, nextField });
      const q = await aiService.askFollowup({ triggerMessage: messageDoc, pending: { action: 'CREATE_POLL', collected, nextField } });
      await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: q });
      return;
    }

    if (action === 'create_reminder' && confidence >= threshold) {
      if (isDirectChat) {
        await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: 'Tính năng tạo nhắc hẹn chỉ khả dụng trong nhóm chat.' });
        return;
      }
      const title = (data.title || '').trim() || null;
      let datetimeIso = data.datetime_iso || null;
      // Nếu AI trả về datetime không có timezone (naive ISO), gắn +07:00 để tránh bị parse thành UTC
      if (datetimeIso && !/[Zz]|[+-]\d{2}:\d{2}$/.test(datetimeIso)) {
        datetimeIso = datetimeIso + '+07:00';
      }
      const remindAt = datetimeIso ? new Date(datetimeIso) : null;
      const validDate = remindAt && !isNaN(remindAt.getTime());

      // Nếu đủ thông tin → tạo luôn
      if (title && validDate) {
        try {
          await aiService.createReminderFromBot({ conversationId: messageDoc.conversationId, botUser, title, remindAt });
        } catch (e) {
          console.error('createReminderFromBot failed', e);
          await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: `Không thể tạo nhắc hẹn: ${e.message}` });
        }
        return;
      }

      // Thiếu thông tin → lưu pending, hỏi field đầu tiên còn thiếu
      const collected = { title, datetime_iso: validDate ? datetimeIso : null };
      const nextField = missing[0] || (!validDate ? 'datetime_iso' : 'title');
      await aiService.setPending(convId, userId, { action: 'CREATE_REMINDER', collected, nextField });
      const q = await aiService.askFollowup({ triggerMessage: messageDoc, pending: { action: 'CREATE_REMINDER', collected, nextField } });
      await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: q });
      return;
    }

    // --- Bước 5: Fallback — chat thường ---
    const history = await Message.find({ conversationId: messageDoc.conversationId })
      .sort({ createdAt: -1 })
      .limit(12)
      .lean();

    const replyText = await aiService.generateReply({
      conversationId: messageDoc.conversationId,
      triggerMessage: messageDoc,
      history: history.reverse(),
    });
    if (replyText) await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: replyText });

  } catch (err) {
    console.error('botService.tryTriggerBot error:', err);
    try {
      const fallback = botConfig.BOT_FALLBACK_MESSAGE || 'Xin lỗi, tôi đang gặp sự cố khi xử lý yêu cầu.';
      await aiService.sendBotMessage({ conversationId: messageDoc.conversationId, text: fallback });
    } catch (e) {
      console.error('Failed to send bot fallback message:', e);
    }
  }
};

module.exports = { tryTriggerBot };
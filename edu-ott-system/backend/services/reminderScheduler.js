const cron = require('node-cron');
const Reminder = require('../models/Reminder');
const { emitToConversation } = require('./socketService');
const logger = require('../utils/logger');

const EXPIRE_AFTER_DAYS = 30;

// Mỗi phút: tìm reminder đến hạn → báo → đánh expired
const triggerDueReminders = async () => {
  try {
    const now = new Date();
    logger.info(`[ReminderScheduler] Checking reminders at ${now.toISOString()}`);
    
    const due = await Reminder.find({
      remindAt: { $lte: now },
      status: 'pending',
    }).populate('createdBy', 'username avatarUrl').populate('participants', 'username avatarUrl');

    for (const reminder of due) {
      logger.info(`[ReminderScheduler] Triggering reminder: ${reminder.title} (${reminder._id}) scheduled for ${reminder.remindAt.toISOString()}`);
      
      reminder.status = 'done';
      await reminder.save();

      const payload = {
        _id: reminder._id,
        title: reminder.title,
        remindAt: reminder.remindAt,
        conversationId: reminder.conversationId,
        participants: reminder.participants,
        createdBy: reminder.createdBy,
      };
      
      // Chỉ emit đến những người đã tham gia (participants)
      const { emitToUser } = require('./socketService');
      reminder.participants.forEach((participant) => {
        const participantId = participant._id || participant;
        emitToUser(participantId.toString(), 'reminder_triggered', payload);
        logger.info(`[ReminderScheduler] Sent notification to participant: ${participantId}`);
      });
      
      logger.info(`[ReminderScheduler] Notified ${reminder.participants.length} participant(s)`);
    }

    if (due.length > 0) {
      logger.info(`[ReminderScheduler] Triggered ${due.length} reminder(s)`);
    }
  } catch (err) {
    logger.error('[ReminderScheduler] triggerDueReminders error:', err.message);
  }
};

// Mỗi ngày lúc 00:05: xóa reminder đã done/expired quá 30 ngày
const cleanupOldReminders = async () => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - EXPIRE_AFTER_DAYS);

    const result = await Reminder.deleteMany({
      status: { $in: ['done', 'expired'] },
      remindAt: { $lt: cutoff },
    });

    if (result.deletedCount > 0) {
      logger.info(`[ReminderScheduler] Cleaned up ${result.deletedCount} old reminder(s)`);
    }
  } catch (err) {
    logger.error('[ReminderScheduler] cleanupOldReminders error:', err.message);
  }
};

const startReminderScheduler = () => {
  // Mỗi phút
  cron.schedule('* * * * *', triggerDueReminders);
  // Mỗi ngày 00:05
  cron.schedule('5 0 * * *', cleanupOldReminders);
  logger.info('[ReminderScheduler] Started');
  
  // Chạy ngay lần đầu để test
  triggerDueReminders();
};

module.exports = { startReminderScheduler, triggerDueReminders };

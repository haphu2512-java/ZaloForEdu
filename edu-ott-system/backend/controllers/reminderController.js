const Reminder = require('../models/Reminder');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const socketService = require('../services/socketService');

const createSysReminderMsg = async (conversationId, senderId, content, reminderId, senderInfo) => {
  const msg = await Message.create({ conversationId, senderId, content, type: 'system_reminder', reminderId });
  await socketService.emitConversationUpdated(conversationId.toString(), {
    conversationId: conversationId.toString(),
    latestMessage: { ...msg.toObject(), senderId: senderInfo },
  });
};

const toStr = (id) => id?.toString();

const ensureMember = (conversation, userId) => {
  const isMember = conversation.participants.some((p) => toStr(p) === toStr(userId));
  if (!isMember) throw new ApiError(403, 'FORBIDDEN', 'You are not a member of this conversation');
};

const ensureCanCreateReminders = (conversation, userId) => {
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(userId);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(userId));
  if (!isOwner && !isAdmin) {
    if (conversation.settings?.canMembersCreateReminders === false) {
      throw new ApiError(403, 'FORBIDDEN', 'Only admin/owner can create reminders in this group');
    }
  }
};

const createReminder = asyncHandler(async (req, res) => {
  const { conversationId, title, remindAt } = req.body;

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureMember(conversation, req.user._id);
  ensureCanCreateReminders(conversation, req.user._id);

  const logger = require('../utils/logger');
  logger.info(`[Reminder] Creating reminder: ${title}, remindAt: ${remindAt}, parsed: ${new Date(remindAt).toISOString()}`);

  const reminder = await Reminder.create({
    conversationId,
    title,
    remindAt,
    createdBy: req.user._id,
    participants: [], // Không tự động thêm người tạo
  });

  await reminder.populate('createdBy', 'username avatarUrl');
  await reminder.populate('participants', 'username avatarUrl');

  socketService.emitToConversation(conversationId.toString(), 'reminder_created', reminder);

  const senderInfo = { _id: req.user._id, username: req.user.username, avatarUrl: req.user.avatarUrl };
  await createSysReminderMsg(conversationId, req.user._id, `${req.user.username} đã tạo nhắc hẹn "${title}"`, reminder._id, senderInfo);

  return successResponse(res, reminder, 'Reminder created', 201);
});

const getConversationReminders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureMember(conversation, req.user._id);

  const reminders = await Reminder.find({ conversationId: id })
    .populate('createdBy', 'username avatarUrl')
    .populate('participants', 'username avatarUrl')
    .populate('declinedBy', 'username avatarUrl')
    .sort({ remindAt: 1 });

  return successResponse(res, reminders, 'Reminders fetched');
});

const updateReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { title, remindAt } = req.body;

  const reminder = await Reminder.findById(id);
  if (!reminder) throw new ApiError(404, 'REMINDER_NOT_FOUND', 'Reminder not found');

  const conversation = await Conversation.findById(reminder.conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const isCreator = toStr(reminder.createdBy) === toStr(req.user._id);
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(req.user._id);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(req.user._id));

  if (!isCreator && !isOwner && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Lacks permission to update this reminder');
  }

  if (title) reminder.title = title;
  if (remindAt) reminder.remindAt = remindAt;
  await reminder.save();

  await reminder.populate('createdBy', 'username avatarUrl');
  await reminder.populate('participants', 'username avatarUrl');

  socketService.emitToConversation(reminder.conversationId.toString(), 'reminder_updated', reminder);

  return successResponse(res, reminder, 'Reminder updated');
});

const deleteReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reminder = await Reminder.findById(id).populate('createdBy', 'username');
  if (!reminder) throw new ApiError(404, 'REMINDER_NOT_FOUND', 'Reminder not found');

  const conversation = await Conversation.findById(reminder.conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');

  const isCreator = toStr(reminder.createdBy) === toStr(req.user._id);
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(req.user._id);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(req.user._id));

  if (!isCreator && !isOwner && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Lacks permission to delete this reminder');
  }

  const deletedTitle = reminder.title;
  await reminder.deleteOne();

  socketService.emitToConversation(reminder.conversationId.toString(), 'reminder_deleted', {
    reminderId: id,
    title: deletedTitle,
    deletedBy: req.user._id,
  });

  return successResponse(res, { title: deletedTitle }, 'Reminder deleted');
});

const joinReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reminder = await Reminder.findById(id);
  if (!reminder) throw new ApiError(404, 'REMINDER_NOT_FOUND', 'Reminder not found');

  const conversation = await Conversation.findById(reminder.conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureMember(conversation, req.user._id);

  const uid = req.user._id;
  if (!reminder.participants.some(p => toStr(p) === toStr(uid))) {
    reminder.participants.push(uid);
  }
  reminder.declinedBy = reminder.declinedBy.filter(p => toStr(p) !== toStr(uid));
  await reminder.save();

  await reminder.populate('participants', 'username avatarUrl');
  await reminder.populate('createdBy', 'username avatarUrl');

  socketService.emitToConversation(reminder.conversationId.toString(), 'reminder_updated', reminder);

  const senderInfoJoin = { _id: req.user._id, username: req.user.username, avatarUrl: req.user.avatarUrl };
  await createSysReminderMsg(reminder.conversationId, req.user._id, `${req.user.username} đã tham gia nhắc hẹn "${reminder.title}"`, reminder._id, senderInfoJoin);

  return successResponse(res, reminder, 'Joined reminder');
});

const declineReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reminder = await Reminder.findById(id);
  if (!reminder) throw new ApiError(404, 'REMINDER_NOT_FOUND', 'Reminder not found');

  const conversation = await Conversation.findById(reminder.conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureMember(conversation, req.user._id);

  const uid = req.user._id;
  if (!reminder.declinedBy.some(p => toStr(p) === toStr(uid))) {
    reminder.declinedBy.push(uid);
  }
  reminder.participants = reminder.participants.filter(p => toStr(p) !== toStr(uid));
  await reminder.save();

  await reminder.populate('declinedBy', 'username avatarUrl');
  await reminder.populate('createdBy', 'username avatarUrl');

  socketService.emitToConversation(reminder.conversationId.toString(), 'reminder_updated', reminder);

  const senderInfoDecline = { _id: req.user._id, username: req.user.username, avatarUrl: req.user.avatarUrl };
  await createSysReminderMsg(reminder.conversationId, req.user._id, `${req.user.username} đã từ chối nhắc hẹn "${reminder.title}"`, reminder._id, senderInfoDecline);

  return successResponse(res, reminder, 'Declined reminder');
});

module.exports = {
  createReminder,
  getConversationReminders,
  updateReminder,
  deleteReminder,
  joinReminder,
  declineReminder,
};

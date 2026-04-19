const Reminder = require('../models/Reminder');
const Conversation = require('../models/Conversation');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

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

  const reminder = await Reminder.create({
    conversationId,
    title,
    remindAt,
    createdBy: req.user._id,
  });

  return successResponse(res, reminder, 'Reminder created', 201);
});

const getConversationReminders = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const conversation = await Conversation.findById(id);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  ensureMember(conversation, req.user._id);

  const reminders = await Reminder.find({ conversationId: id })
    .populate('createdBy', 'username avatarUrl')
    .sort({ remindAt: 1 });

  return successResponse(res, reminders, 'Reminders fetched');
});

const deleteReminder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const reminder = await Reminder.findById(id);
  if (!reminder) throw new ApiError(404, 'REMINDER_NOT_FOUND', 'Reminder not found');

  const conversation = await Conversation.findById(reminder.conversationId);
  if (!conversation) throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found');
  
  // Only creator or admin/owner of the group can delete
  const isCreator = toStr(reminder.createdBy) === toStr(req.user._id);
  const isOwner = toStr(conversation.ownerId || conversation.createdBy) === toStr(req.user._id);
  const isAdmin = (conversation.adminIds || []).some((a) => toStr(a) === toStr(req.user._id));

  if (!isCreator && !isOwner && !isAdmin) {
    throw new ApiError(403, 'FORBIDDEN', 'Lacks permission to delete this reminder');
  }

  await reminder.deleteOne();

  return successResponse(res, {}, 'Reminder deleted');
});

module.exports = {
  createReminder,
  getConversationReminders,
  deleteReminder,
};

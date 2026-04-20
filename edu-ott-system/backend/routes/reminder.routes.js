const express = require('express');
const reminderController = require('../controllers/reminderController');
const auth = require('../middlewares/auth');
const validate = require('../middlewares/validate');
const { z } = require('zod');

const router = express.Router();

const createReminderSchema = z.object({
  conversationId: z.string().min(24).max(24),
  title: z.string().min(1).max(200),
  remindAt: z.string().datetime(),
});

const updateReminderSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  remindAt: z.string().datetime().optional(),
});

const reminderIdParamSchema = z.object({
  id: z.string().min(24).max(24),
});

const conversationIdParamSchema = z.object({
  id: z.string().min(24).max(24),
});

router.post('/', auth, validate({ body: createReminderSchema }), reminderController.createReminder);
router.get('/conversation/:id', auth, validate({ params: conversationIdParamSchema }), reminderController.getConversationReminders);
router.put('/:id', auth, validate({ params: reminderIdParamSchema, body: updateReminderSchema }), reminderController.updateReminder);
router.delete('/:id', auth, validate({ params: reminderIdParamSchema }), reminderController.deleteReminder);
router.post('/:id/join', auth, validate({ params: reminderIdParamSchema }), reminderController.joinReminder);
router.post('/:id/decline', auth, validate({ params: reminderIdParamSchema }), reminderController.declineReminder);

module.exports = router;

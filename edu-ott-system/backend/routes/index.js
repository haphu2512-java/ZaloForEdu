const express = require('express');

const authRoutes = require('./auth.routes');
const conversationRoutes = require('./conversation.routes');
const friendRoutes = require('./friend.routes');
const mediaRoutes = require('./media.routes');
const messageRoutes = require('./message.routes');
const notificationRoutes = require('./notification.routes');
const searchRoutes = require('./search.routes');
const settingsRoutes = require('./settings.routes');
const userRoutes = require('./user.routes');
const chatbotRoutes = require('./chatbot.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/media', mediaRoutes);
router.use('/notifications', notificationRoutes);
router.use('/search', searchRoutes);
router.use('/settings', settingsRoutes);
router.use('/chatbot', chatbotRoutes);

module.exports = router;

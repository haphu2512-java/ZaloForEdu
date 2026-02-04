const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const classRoutes = require('./classRoutes');
const groupRoutes = require('./groupRoutes');
const messageRoutes = require('./messageRoutes');
const fileRoutes = require('./fileRoutes');
const analyticsRoutes = require('./analyticsRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/classes', classRoutes);
router.use('/groups', groupRoutes);
router.use('/messages', messageRoutes);
router.use('/files', fileRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');

const analyticsController = {
  getDashboard: (req, res) => res.json({ message: 'Get dashboard analytics' }),
  getClassAnalytics: (req, res) => res.json({ message: 'Get class analytics' }),
  getUserAnalytics: (req, res) => res.json({ message: 'Get user analytics' }),
};

router.use(protect);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/classes/:id', analyticsController.getClassAnalytics);
router.get('/users/:id', restrictTo('admin', 'teacher'), analyticsController.getUserAnalytics);

module.exports = router;

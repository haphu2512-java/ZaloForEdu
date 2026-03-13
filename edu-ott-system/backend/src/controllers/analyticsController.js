const analyticsService = require('../services/analyticsService');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get dashboard analytics
// @route   GET /api/v1/analytics/dashboard
// @access  Private
exports.getDashboard = asyncHandler(async (req, res, next) => {
  const data = await analyticsService.getDashboard(req.user);

  res.status(200).json({
    status: 'success',
    data,
  });
});

// @desc    Get class analytics
// @route   GET /api/v1/analytics/classes/:id
// @access  Private
exports.getClassAnalytics = asyncHandler(async (req, res, next) => {
  const data = await analyticsService.getClassAnalytics(req.params.id);

  res.status(200).json({
    status: 'success',
    data,
  });
});

// @desc    Get user analytics
// @route   GET /api/v1/analytics/users/:id
// @access  Private (Admin/Teacher)
exports.getUserAnalytics = asyncHandler(async (req, res, next) => {
  const data = await analyticsService.getUserAnalytics(req.params.id);

  res.status(200).json({
    status: 'success',
    data,
  });
});

const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');

const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Number(req.query.limit) || 20);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments({ userId: req.user._id }),
  ]);

  return successResponse(
    res,
    {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
    'Notifications fetched',
  );
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification || !notification.userId.equals(req.user._id)) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();
  return successResponse(res, notification, 'Notification marked as read');
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, isRead: false },
    { isRead: true, readAt: new Date() },
  );
  return successResponse(res, {}, 'All notifications marked as read');
});

const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  return successResponse(res, { count }, 'Unread count fetched');
});

const deleteNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification || !notification.userId.equals(req.user._id)) {
    throw new ApiError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found');
  }
  await Notification.findByIdAndDelete(req.params.id);
  return successResponse(res, {}, 'Notification deleted');
});

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllRead,
  getUnreadCount,
  deleteNotification,
};

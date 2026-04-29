const UserSettings = require('../models/UserSettings');
const asyncHandler = require('../utils/asyncHandler');
const { successResponse } = require('../utils/apiResponse');

const defaultSettings = {
  theme: 'system',
  notifications: {
    pushEnabled: true,
    messageEnabled: true,
    groupEnabled: true,
    soundEnabled: true,
  },
};

const getMySettings = asyncHandler(async (req, res) => {
  const settings = await UserSettings.findOneAndUpdate(
    { userId: req.user._id },
    { $setOnInsert: { userId: req.user._id, ...defaultSettings } },
    { returnDocument: 'after', upsert: true },
  );

  return successResponse(res, settings, 'User settings fetched');
});

const updateMySettings = asyncHandler(async (req, res) => {
  const updates = req.body;
  const settings = await UserSettings.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates, $setOnInsert: { userId: req.user._id } },
    { returnDocument: 'after', upsert: true },
  );

  // Emit real-time event if theme changed
  if (updates.theme) {
    const socketService = require('../services/socketService');
    socketService.emitToUser(req.user._id.toString(), 'settings_changed', {
      theme: updates.theme,
      notifications: settings.notifications,
    });
  }

  return successResponse(res, settings, 'User settings updated');
});

module.exports = {
  getMySettings,
  updateMySettings,
};

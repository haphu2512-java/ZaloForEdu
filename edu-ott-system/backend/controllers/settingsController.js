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
    { new: true, upsert: true },
  );

  return successResponse(res, settings, 'User settings fetched');
});

const updateMySettings = asyncHandler(async (req, res) => {
  const updates = req.body;
  const settings = await UserSettings.findOneAndUpdate(
    { userId: req.user._id },
    { $set: updates, $setOnInsert: { userId: req.user._id } },
    { new: true, upsert: true },
  );

  return successResponse(res, settings, 'User settings updated');
});

module.exports = {
  getMySettings,
  updateMySettings,
};

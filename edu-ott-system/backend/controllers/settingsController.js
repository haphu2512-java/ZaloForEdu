const bcrypt = require('bcryptjs');
const UserSettings = require('../models/UserSettings');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
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
  // Run both in parallel: upsert settings doc + check if PIN has been set
  const [settings, pinExists] = await Promise.all([
    UserSettings.findOneAndUpdate(
      { userId: req.user._id },
      { $setOnInsert: { userId: req.user._id, ...defaultSettings } },
      { returnDocument: 'after', upsert: true },
    ),
    // hiddenPinHash has select:false so we check existence separately
    UserSettings.exists({ userId: req.user._id, hiddenPinHash: { $exists: true, $ne: null } }),
  ]);

  const plain = settings.toObject();
  plain.hasHiddenPin = !!pinExists;
  // hiddenPinHash is not in plain (select:false) — nothing to delete

  return successResponse(res, plain, 'User settings fetched');
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

// PUT /settings/hidden-pin   — set or change the hidden-conversations PIN
const setHiddenPin = asyncHandler(async (req, res) => {
  const { pin, currentPin } = req.body;
  if (!pin || !/^\d{4}$/.test(pin)) {
    throw new ApiError(400, 'INVALID_PIN', 'PIN phải là 4 chữ số');
  }

  // Fetch existing hash (select: false so we must explicitly include it)
  const existing = await UserSettings.findOne({ userId: req.user._id }).select('+hiddenPinHash');

  // If a PIN already exists, require the current PIN to change it
  if (existing?.hiddenPinHash) {
    if (!currentPin) throw new ApiError(400, 'CURRENT_PIN_REQUIRED', 'Cần nhập PIN hiện tại để thay đổi');
    const match = await bcrypt.compare(String(currentPin), existing.hiddenPinHash);
    if (!match) throw new ApiError(401, 'WRONG_PIN', 'PIN hiện tại không đúng');
  }

  const hash = await bcrypt.hash(pin, 10);
  await UserSettings.findOneAndUpdate(
    { userId: req.user._id },
    { $set: { hiddenPinHash: hash }, $setOnInsert: { userId: req.user._id } },
    { upsert: true },
  );

  return successResponse(res, { hasHiddenPin: true }, 'PIN đã được cập nhật');
});

// POST /settings/hidden-pin/verify   — verify PIN, returns 200 if correct
const verifyHiddenPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  if (!pin) throw new ApiError(400, 'INVALID_PIN', 'Thiếu PIN');

  const settings = await UserSettings.findOne({ userId: req.user._id }).select('+hiddenPinHash');
  if (!settings?.hiddenPinHash) {
    throw new ApiError(404, 'NO_PIN_SET', 'Chưa thiết lập PIN');
  }

  const match = await bcrypt.compare(String(pin), settings.hiddenPinHash);
  if (!match) throw new ApiError(401, 'WRONG_PIN', 'PIN không đúng');

  return successResponse(res, { verified: true }, 'PIN hợp lệ');
});

// DELETE /settings/hidden-pin   — remove PIN (requires current PIN)
const removeHiddenPin = asyncHandler(async (req, res) => {
  const { pin } = req.body;
  const settings = await UserSettings.findOne({ userId: req.user._id }).select('+hiddenPinHash');
  if (!settings?.hiddenPinHash) {
    throw new ApiError(404, 'NO_PIN_SET', 'Chưa thiết lập PIN');
  }
  const match = await bcrypt.compare(String(pin || ''), settings.hiddenPinHash);
  if (!match) throw new ApiError(401, 'WRONG_PIN', 'PIN không đúng');

  await UserSettings.updateOne({ userId: req.user._id }, { $set: { hiddenPinHash: null } });
  return successResponse(res, { hasHiddenPin: false }, 'Đã xóa PIN');
});

// POST /settings/hidden-pin/reset  — reset PIN bằng mật khẩu tài khoản
const resetHiddenPin = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) throw new ApiError(400, 'INVALID_PASSWORD', 'Thiếu mật khẩu tài khoản');

  // Verify account password
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Người dùng không tồn tại');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new ApiError(401, 'WRONG_PASSWORD', 'Mật khẩu tài khoản không đúng');

  await UserSettings.updateOne(
    { userId: req.user._id },
    { $set: { hiddenPinHash: null } },
    { upsert: true },
  );

  return successResponse(res, { hasHiddenPin: false }, 'Đã đặt lại mã PIN');
});

module.exports = {
  getMySettings,
  updateMySettings,
  setHiddenPin,
  verifyHiddenPin,
  removeHiddenPin,
  resetHiddenPin,
};


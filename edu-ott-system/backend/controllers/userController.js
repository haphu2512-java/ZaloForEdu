const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/email');

const createEmailOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendVerificationOtp = async ({ email, otp }) => {
  await sendEmail({
    to: email,
    subject: 'Mã OTP xác thực email - Zalo Clone',
    text: `Mã OTP xác thực email của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`,
    html: `<p>Mã OTP xác thực email của bạn là: <strong>${otp}</strong></p><p>Mã có hiệu lực trong 10 phút.</p>`,
  });
};

const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash -tokenVersion');
  if (!user || user.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }
  return successResponse(res, user, 'User fetched');
});

const updateUserById = asyncHandler(async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only update your own profile');
  }

  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  const updates = req.body || {};
  if (typeof updates.username === 'string') {
    user.username = updates.username.trim();
  }
  if (typeof updates.phone !== 'undefined') {
    user.phone = updates.phone || null;
  }
  if (typeof updates.avatarUrl !== 'undefined') {
    user.avatarUrl = updates.avatarUrl || null;
  }

  if (typeof updates.email !== 'undefined') {
    const nextEmail = updates.email ? String(updates.email).trim().toLowerCase() : null;
    const currentEmail = user.email ? String(user.email).trim().toLowerCase() : null;

    if (nextEmail && nextEmail !== currentEmail) {
      const duplicated = await User.findOne({
        _id: { $ne: user._id },
        email: nextEmail,
        deletedAt: null,
      });
      if (duplicated) {
        throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
      }

      user.email = nextEmail;
      user.isEmailVerified = false;
      user.emailVerificationToken = createEmailOtp();
      user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

      await sendVerificationOtp({
        email: nextEmail,
        otp: user.emailVerificationToken,
      });
    } else if (!nextEmail) {
      user.email = null;
      user.isEmailVerified = false;
      user.emailVerificationToken = null;
      user.emailVerificationExpires = null;
    }
  }

  await user.save();
  const safeUser = await User.findById(user._id).select('-passwordHash -tokenVersion');
  return successResponse(res, safeUser, 'User updated');
});

const deleteUserById = asyncHandler(async (req, res) => {
  if (req.user._id.toString() !== req.params.id) {
    throw new ApiError(403, 'FORBIDDEN', 'You can only delete your own account');
  }

  const user = await User.findById(req.params.id);
  if (!user || user.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  user.deletedAt = new Date();
  user.isOnline = false;
  await user.save();

  return successResponse(res, {}, 'User soft deleted');
});

const blockOrUnblockUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  if (req.user._id.toString() === targetId) {
    throw new ApiError(400, 'INVALID_ACTION', 'Cannot block yourself');
  }

  const target = await User.findById(targetId);
  if (!target || target.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'Target user not found');
  }

  const action = req.body.action || 'block';
  const currentUser = await User.findById(req.user._id);
  const hasBlocked = currentUser.blockedUsers.some((item) => item.equals(targetId));

  if (action === 'block' && !hasBlocked) {
    currentUser.blockedUsers.push(targetId);
  } else if (action === 'unblock' && hasBlocked) {
    currentUser.blockedUsers = currentUser.blockedUsers.filter((item) => !item.equals(targetId));
  }

  await currentUser.save();

  return successResponse(
    res,
    { blockedUsers: currentUser.blockedUsers, action },
    `User ${action === 'block' ? 'blocked' : 'unblocked'} successfully`,
  );
});

const getBlockedUsers = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id)
    .populate('blockedUsers', 'username avatarUrl email isOnline lastSeen')
    .select('blockedUsers');

  if (!currentUser) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return successResponse(res, { blockedUsers: currentUser.blockedUsers }, 'Blocked users fetched');
});

module.exports = {
  getUserById,
  updateUserById,
  deleteUserById,
  blockOrUnblockUser,
  getBlockedUsers,
};

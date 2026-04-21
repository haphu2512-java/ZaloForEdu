const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { sendEmail } = require('../utils/email');
const { getRedis, isRedisAvailable, keyWithPrefix } = require('../services/redisClient');
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
  if (typeof updates.username === 'string') user.username = updates.username.trim();
  if (typeof updates.phone !== 'undefined') user.phone = updates.phone || null;
  if (typeof updates.avatarUrl !== 'undefined') user.avatarUrl = updates.avatarUrl || null;

  // Update phone
  if (typeof updates.phone !== 'undefined') {
    const nextPhone = updates.phone ? String(updates.phone).trim() : null;
    const currentPhone = user.phone ? String(user.phone).trim() : null;

    if (nextPhone && nextPhone !== currentPhone) {
      const duplicated = await User.findOne({
        _id: { $ne: user._id },
        phone: nextPhone,
        deletedAt: null,
      });
      if (duplicated) {
        throw new ApiError(409, 'PHONE_EXISTS', 'Số điện thoại đã được sử dụng bởi tài khoản khác');
      }
      user.phone = nextPhone;
      // Phone added manually (not via OTP) → mark as unverified
      // But if user already had phone verified, keep it
      if (!user.isPhoneVerified) {
        user.isPhoneVerified = false;
      }
    } else if (!nextPhone) {
      user.phone = null;
      user.isPhoneVerified = false;
    }
  }

  // Update email
  if (typeof updates.email !== 'undefined') {
    const nextEmail = updates.email ? String(updates.email).trim().toLowerCase() : null;
    const currentEmail = user.email ? String(user.email).trim().toLowerCase() : null;

    if (nextEmail && nextEmail !== currentEmail) {
      const duplicated = await User.findOne({ _id: { $ne: user._id }, email: nextEmail, deletedAt: null });
      if (duplicated) throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');

      user.email = nextEmail;
      user.isEmailVerified = false;
      user.emailVerificationToken = createEmailOtp();
      user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

      await sendVerificationOtp({ email: nextEmail, otp: user.emailVerificationToken });
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
  if (req.user._id.toString() === targetId) throw new ApiError(400, 'INVALID_ACTION', 'Cannot block yourself');

  const target = await User.findById(targetId);
  if (!target || target.deletedAt) throw new ApiError(404, 'USER_NOT_FOUND', 'Target user not found');

  const action = req.body.action || 'block';
  const currentUser = await User.findById(req.user._id);
  const hasBlocked = currentUser.blockedUsers.some((item) => item.equals(targetId));

  if (action === 'block' && !hasBlocked) currentUser.blockedUsers.push(targetId);
  else if (action === 'unblock' && hasBlocked) currentUser.blockedUsers = currentUser.blockedUsers.filter((item) => !item.equals(targetId));

  await currentUser.save();
  return successResponse(res, { blockedUsers: currentUser.blockedUsers, action }, `User ${action === 'block' ? 'blocked' : 'unblocked'} successfully`);
});

const getBlockedUsers = asyncHandler(async (req, res) => {
  const currentUser = await User.findById(req.user._id).populate('blockedUsers', 'username avatarUrl email isOnline lastSeen').select('blockedUsers');
  if (!currentUser) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  return successResponse(res, { blockedUsers: currentUser.blockedUsers }, 'Blocked users fetched');
});

// [ADMIN] Update user status
/**
 * [ADMIN] Update user status (isActive, banReason)
 * Tích hợp thêm lệnh "warn" để lưu Redis
 */
const updateUserStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'admin') {
    throw new ApiError(403, 'FORBIDDEN', 'Only admins can perform this action');
  }

  const { targetUserId, isActive, banReason, action } = req.body;
  if (!targetUserId) throw new ApiError(400, 'MISSING_USER_ID', 'Target user ID is required');

  const user = await User.findById(targetUserId);
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

  // Nếu Admin yêu cầu gửi cảnh cáo (action === 'warn')
  if (action === 'warn') {
    if (isRedisAvailable()) {
      const redis = getRedis();
      const warnKey = keyWithPrefix(`warnings:${targetUserId}`);
      const currentWarnings = await redis.incr(warnKey);
      await redis.expire(warnKey, 30 * 24 * 60 * 60); // 30 ngày

      if (currentWarnings >= 3) {
        user.isActive = false;
        user.banReason = 'Hệ thống tự động khóa do nhận 3 cảnh cáo từ Quản trị viên';
        user.tokenVersion += 1;
        await user.save();
      }
      return successResponse(res, { userId: user._id, warningCount: currentWarnings, isActive: user.isActive }, 'Gửi cảnh cáo thành công');
    }
    throw new ApiError(500, 'SERVER_ERROR', 'Redis không khả dụng, không thể gửi cảnh cáo.');
  }

  // Các thao tác đóng/mở khóa bình thường
  if (typeof isActive !== 'undefined') user.isActive = !!isActive;
  if (typeof banReason !== 'undefined') user.banReason = banReason || null;

  await user.save();

  return successResponse(res, {
    userId: user._id,
    isActive: user.isActive,
    banReason: user.banReason
  }, 'User status updated');
});

/**
 * Report người dùng (Cộng đồng tự xử lý Spam)
 */
const reportUser = asyncHandler(async (req, res) => {
  const targetId = req.params.id;
  const reporterId = req.user._id.toString();
  const { reason } = req.body;

  if (reporterId === targetId) throw new ApiError(400, 'INVALID_ACTION', 'Không thể tự báo cáo chính mình');

  const target = await User.findById(targetId);
  if (!target || target.deletedAt) throw new ApiError(404, 'USER_NOT_FOUND', 'Người dùng không tồn tại');
  if (target.isActive === false) return successResponse(res, {}, 'Tài khoản này đã bị khóa từ trước.');

  if (isRedisAvailable()) {
    const redis = getRedis();
    const reportKey = keyWithPrefix(`reports_received:${targetId}`);

    // Thêm người tố cáo vào Set (chống báo cáo 1 người nhiều lần)
    const isNewReport = await redis.sAdd(reportKey, reporterId);

    if (isNewReport) {
      await redis.expire(reportKey, 7 * 24 * 60 * 60); // 7 ngày
      const totalReports = await redis.sCard(reportKey);

      // Auto-Ban nếu nhận đủ 10 vé
      if (totalReports >= 10) {
        target.isActive = false;
        target.banReason = `Khóa tự động: Nhận ${totalReports} báo cáo từ cộng đồng (Gần nhất: ${reason})`;
        target.tokenVersion += 1;
        await target.save();
      }
    }
  }

  return successResponse(res, {}, 'Đã gửi báo cáo thành công.');
});

/**
 * Lấy tất cả user (Cập nhật quét Redis lấy điểm cảnh cáo)
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ deletedAt: null })
    .select('-passwordHash -tokenVersion -resetPasswordToken')
    .sort({ createdAt: -1 })
    .lean();

  const redis = isRedisAvailable() ? getRedis() : null;

  const usersWithWarnings = await Promise.all(users.map(async (user) => {
    let warnings = 0;
    let reportCount = 0;
    if (redis) {
      try {
        const warnKey = keyWithPrefix(`warnings:${user._id.toString()}`);
        const val = await redis.get(warnKey);
        if (val) warnings = parseInt(val, 10);
      } catch (e) { /* ignore */ }
      try {
        const reportKey = keyWithPrefix(`reports_received:${user._id.toString()}`);
        const count = await redis.sCard(reportKey);
        if (count) reportCount = count;
      } catch (e) { /* ignore */ }
    }
    return {
      ...user,
      id: user._id,
      warningCount: warnings,
      reportCount,
    };
  }));

  return successResponse(res, { users: usersWithWarnings }, 'Lấy danh sách người dùng thành công');
});

module.exports = {
  getUserById,
  updateUserById,
  deleteUserById,
  blockOrUnblockUser,
  getBlockedUsers,
  updateUserStatus,
  getAllUsers,
  reportUser,
};
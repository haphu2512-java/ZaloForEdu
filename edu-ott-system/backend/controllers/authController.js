const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { issueTokenPair, rotateRefreshToken, revokeAllSessions, revokeRefreshToken } = require('../services/authService');
const { sendEmail } = require('../utils/email');
const { getRedis, isRedisAvailable, keyWithPrefix } = require('../services/redisClient');

const OTP_COOLDOWN_SECONDS = 60; // 1 minute between OTP sends
const OTP_EXPIRE_MINUTES = 10;

const toAuthPayload = (user, tokens) => ({
  user: user.toJSON(),
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
});

const generateUsername = (identifier) => {
  const base = identifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'user';
  return `${base}_${crypto.randomBytes(3).toString('hex')}`;
};

const createOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// ─── Email helpers ────────────────────────────────────────────
const sendEmailOtp = async (email, otp, subject = 'Mã OTP xác thực - ZaloApp') => {
  await sendEmail({
    to: email,
    subject,
    text: `Mã OTP của bạn là: ${otp}. Mã có hiệu lực trong ${OTP_EXPIRE_MINUTES} phút.`,
    html: `<p>Mã OTP của bạn là: <strong>${otp}</strong></p><p>Mã có hiệu lực trong ${OTP_EXPIRE_MINUTES} phút.</p>`,
  });
};

// ─── Phone SMS mock (giả lập - bạn có thể tích hợp Twilio sau) ─
const sendSmsOtp = (phone, otp, type = 'verify') => {
  const msg = type === 'forgot_password'
    ? `[SMS] Mã OTP đặt lại mật khẩu ZaloApp: ${otp} (${OTP_EXPIRE_MINUTES} phút)`
    : `[SMS] Mã OTP xác thực số ĐT ZaloApp: ${otp} (${OTP_EXPIRE_MINUTES} phút)`;
  // In ra Terminal Backend để dev xem mã (thay thế bằng Twilio/ESMS khi go-live)
  console.log(`\n══════════════════════════════════════
${msg}
Gửi tới: ${phone}
══════════════════════════════════════\n`);
};

// ─── Anti-spam OTP guard ──────────────────────────────────────
const checkOtpCooldown = (user) => {
  if (user.lastOtpSentAt) {
    const elapsedSeconds = (Date.now() - user.lastOtpSentAt.getTime()) / 1000;
    if (elapsedSeconds < OTP_COOLDOWN_SECONDS) {
      const remaining = Math.ceil(OTP_COOLDOWN_SECONDS - elapsedSeconds);
      throw new ApiError(429, 'OTP_COOLDOWN', `Vui lòng chờ ${remaining} giây trước khi gửi lại mã.`);
    }
  }
};

// ════════════════════════════════════════════════════════════════
//  REGISTER
// ════════════════════════════════════════════════════════════════
const register = asyncHandler(async (req, res) => {
  const { username, email, password, phone } = req.body;

  const query = [];
  if (email) query.push({ email: email.toLowerCase() });
  if (phone) query.push({ phone });
  if (username) query.push({ username });

  if (query.length > 0) {
    const duplicated = await User.findOne({ $or: query });
    if (duplicated) {
      if (email && duplicated.email === email.toLowerCase()) throw new ApiError(409, 'EMAIL_EXISTS', 'Email đã tồn tại');
      if (phone && duplicated.phone === phone) throw new ApiError(409, 'PHONE_EXISTS', 'Số điện thoại đã tồn tại');
      if (username && duplicated.username === username) throw new ApiError(409, 'USERNAME_EXISTS', 'Tên người dùng đã tồn tại');
    }
  }

  const finalUsername = username || generateUsername(email || phone || 'user');
  const passwordHash = await bcrypt.hash(password, 10);

  const otp = createOtp();
  const now = new Date();
  const otpExpires = new Date(now.getTime() + OTP_EXPIRE_MINUTES * 60 * 1000);

  let emailVerificationToken = null;
  let emailVerificationExpires = null;
  let otpCode = null;
  let otpExpiry = null;
  let otpType = null;

  if (email) {
    emailVerificationToken = otp;
    emailVerificationExpires = otpExpires;
  } else if (phone) {
    otpCode = otp;
    otpExpiry = otpExpires;
    otpType = 'phone_verify';
  }

  const user = await User.create({
    username: finalUsername,
    email: email ? email.toLowerCase() : undefined,
    passwordHash,
    phone: phone || undefined,
    emailVerificationToken,
    emailVerificationExpires,
    otpCode,
    otpExpires: otpExpiry,
    otpType,
    lastOtpSentAt: now,
  });

  // Send OTP
  if (email) {
    await sendEmailOtp(email, otp, 'Mã OTP xác thực tài khoản ZaloApp').catch((err) =>
      console.error('Failed to send verification email', err),
    );
  } else if (phone) {
    sendSmsOtp(phone, otp, 'verify');
  }

  return successResponse(res, {
    userId: user._id,
    registrationMethod: email ? 'email' : 'phone',
    ...(email ? { email } : { phone }),
  }, 'Đăng ký thành công. Vui lòng nhập mã OTP để xác thực.', 201);
});

// ════════════════════════════════════════════════════════════════
//  VERIFY OTP (Email or Phone)
// ════════════════════════════════════════════════════════════════
const verifyOtp = asyncHandler(async (req, res) => {
  const { token, email, phone } = req.body;

  let user = null;

  if (email) {
    user = await User.findOne({
      email: email.toLowerCase(),
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: Date.now() },
    });
    if (!user) throw new ApiError(400, 'INVALID_OTP', 'Mã OTP không hợp lệ hoặc đã hết hạn');

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
  } else if (phone) {
    user = await User.findOne({
      phone,
      otpCode: token,
      otpExpires: { $gt: Date.now() },
      otpType: 'phone_verify',
    });
    if (!user) throw new ApiError(400, 'INVALID_OTP', 'Mã OTP không hợp lệ hoặc đã hết hạn');

    user.isPhoneVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    user.otpType = undefined;
  } else {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Cần cung cấp email hoặc số điện thoại');
  }

  await user.save();
  return successResponse(res, {}, 'Xác thực thành công');
});

// ════════════════════════════════════════════════════════════════
//  RESEND OTP
// ════════════════════════════════════════════════════════════════
const resendOtp = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  let user = null;
  if (email) {
    user = await User.findOne({ email: email.toLowerCase(), deletedAt: null });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Tài khoản không tồn tại');
    if (user.isEmailVerified) return successResponse(res, {}, 'Email đã được xác thực');
  } else if (phone) {
    user = await User.findOne({ phone, deletedAt: null });
    if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Tài khoản không tồn tại');
    if (user.isPhoneVerified) return successResponse(res, {}, 'Số điện thoại đã được xác thực');
  } else {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Cần cung cấp email hoặc số điện thoại');
  }

  // Anti-spam cooldown
  checkOtpCooldown(user);

  const otp = createOtp();
  const now = new Date();
  const otpExpires = new Date(now.getTime() + OTP_EXPIRE_MINUTES * 60 * 1000);

  if (email) {
    user.emailVerificationToken = otp;
    user.emailVerificationExpires = otpExpires;
    user.lastOtpSentAt = now;
    await user.save();
    await sendEmailOtp(email, otp);
  } else {
    user.otpCode = otp;
    user.otpExpires = otpExpires;
    user.otpType = 'phone_verify';
    user.lastOtpSentAt = now;
    await user.save();
    sendSmsOtp(phone, otp, 'verify');
  }

  return successResponse(res, {}, 'Đã gửi lại mã OTP');
});

// ════════════════════════════════════════════════════════════════
//  LOGIN
// ════════════════════════════════════════════════════════════════
const login = asyncHandler(async (req, res) => {
  const { email, username, phone, password, device = 'web' } = req.body;

  const query = [];
  if (email) query.push({ email: email.toLowerCase() });
  if (username) query.push({ username });
  if (phone) query.push({ phone });

  const user = await User.findOne({ $or: query });

  if (!user || user.deletedAt) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email/SĐT hoặc mật khẩu không đúng');
  }

  // 1. Kiểm tra tài khoản có bị khóa không
  if (user.isActive === false) {
    throw new ApiError(403, 'ACCOUNT_LOCKED', user.banReason || 'Tài khoản của bạn đã bị khóa.');
  }

  // 2. Kiểm tra tài khoản đã xác thực chưa (chỉ check contact đang dùng để login)
  const loginByEmail = !!email;
  const loginByPhone = !!phone;

  if (loginByEmail && user.email && !user.isEmailVerified) {
    throw new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Email chưa được xác thực. Vui lòng nhập mã OTP đã gửi đến email.');
  }
  if (loginByPhone && user.phone && !user.isPhoneVerified) {
    throw new ApiError(403, 'PHONE_NOT_VERIFIED', 'Số điện thoại chưa được xác thực. Vui lòng nhập mã OTP đã gửi đến điện thoại.');
  }

  const passwordToCompare = user.passwordHash || user.password;
  if (!passwordToCompare) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Tài khoản không hợp lệ');
  }

  const validPassword = await bcrypt.compare(password, passwordToCompare);

  // 2. Xử lý khóa tự động nếu sai mật khẩu (Dùng Redis của bạn)
  if (!validPassword) {
    if (isRedisAvailable()) {
      const redis = getRedis();
      const failKey = keyWithPrefix(`login_fails:${user._id.toString()}`);
      
      const failCount = await redis.incr(failKey);
 
      if (failCount === 3) {
        await redis.expire(failKey, 360);
      }

      // Khóa tự động nếu sai 5 lần
      if (failCount >= 5) {
        user.isActive = false;
        user.banReason = 'Hệ thống tự động khóa bảo vệ do nhập sai mật khẩu quá 5 lần.';
        user.tokenVersion += 1;
        user.webTokenVersion += 1;
        user.mobileTokenVersion += 1;
        await user.save();
        throw new ApiError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa bảo vệ do nhập sai mật khẩu quá 5 lần!');
      }

      throw new ApiError(401, 'INVALID_CREDENTIALS', `Mật khẩu không đúng. Bạn còn ${5 - failCount} lần thử trước khi bị khóa.`);
    }
    
    // Fallback nếu Redis sập
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email/SĐT hoặc mật khẩu không đúng');
  }

  // 3. Đăng nhập thành công -> Xóa cờ lỗi trong Redis
  if (isRedisAvailable()) {
    const redis = getRedis();
    const failKey = keyWithPrefix(`login_fails:${user._id.toString()}`);
    await redis.del(failKey);
  }

  // issueTokenPair bumps the device version → force-logout previous session on same device
  const tokens = await issueTokenPair(user, device);

  // Reload user after version bump
  const freshUser = await User.findById(user._id);
  return successResponse(res, { ...toAuthPayload(freshUser, tokens), device }, 'Đăng nhập thành công');
});
// ════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD (3-step flow: send OTP → verify OTP → reset)
// ════════════════════════════════════════════════════════════════
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  const query = [];
  if (email) query.push({ email: email.toLowerCase() });
  if (phone) query.push({ phone });

  const user = await User.findOne({ $or: query });

  // Return success even if not found (security: don't leak account existence)
  if (!user) {
    return successResponse(res, {}, 'Nếu tài khoản tồn tại, mã OTP đã được gửi đi.');
  }

  checkOtpCooldown(user);

  const otp = createOtp();
  const now = new Date();

  user.otpCode = otp;
  user.otpExpires = new Date(now.getTime() + OTP_EXPIRE_MINUTES * 60 * 1000);
  user.otpType = 'forgot_password';
  user.lastOtpSentAt = now;
  await user.save();

  if (email) {
    await sendEmailOtp(email, otp, 'Mã OTP đặt lại mật khẩu ZaloApp').catch((err) =>
      console.error('Failed to send reset email', err),
    );
  } else if (phone) {
    sendSmsOtp(phone, otp, 'forgot_password');
  }

  return successResponse(res, {}, 'Nếu tài khoản tồn tại, mã OTP đã được gửi đi.');
});

// Step 2: Verify forgot-password OTP → returns a short-lived resetToken
const verifyForgotOtp = asyncHandler(async (req, res) => {
  const { email, phone, otp } = req.body;

  let user = null;
  if (email) {
    user = await User.findOne({ email: email.toLowerCase(), otpCode: otp, otpType: 'forgot_password', otpExpires: { $gt: Date.now() } });
  } else if (phone) {
    user = await User.findOne({ phone, otpCode: otp, otpType: 'forgot_password', otpExpires: { $gt: Date.now() } });
  }

  if (!user) throw new ApiError(400, 'INVALID_OTP', 'Mã OTP không hợp lệ hoặc đã hết hạn');

  // Generate a reset token (hashed), valid 10 min
  const resetToken = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000);
  user.otpCode = undefined;
  user.otpExpires = undefined;
  user.otpType = undefined;
  await user.save();

  return successResponse(res, { resetToken }, 'Mã OTP hợp lệ. Vui lòng nhập mật khẩu mới.');
});

// Step 3: Reset password using resetToken
const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  // Invalidate ALL sessions on ALL devices
  user.tokenVersion += 1;
  user.webTokenVersion += 1;
  user.mobileTokenVersion += 1;
  await user.save();

  return successResponse(res, {}, 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
});

// ════════════════════════════════════════════════════════════════
//  OTHER AUTH
// ════════════════════════════════════════════════════════════════
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const tokens = await rotateRefreshToken(token);
  const user = await User.findById(tokens.userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Không tìm thấy người dùng');
  }
  return successResponse(res, toAuthPayload(user, tokens), 'Token đã được làm mới');
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  await revokeRefreshToken(token);
  return successResponse(res, {}, 'Đăng xuất thành công');
});

const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllSessions(req.user._id);
  return successResponse(res, {}, 'Đã đăng xuất khỏi tất cả thiết bị');
});

const getMe = asyncHandler(async (req, res) => {
  return successResponse(res, req.user.toJSON(), 'User fetched');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);

  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new ApiError(400, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không đúng');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion += 1;
  user.webTokenVersion += 1;
  user.mobileTokenVersion += 1;
  await user.save();

  return successResponse(res, {}, 'Đổi mật khẩu thành công');
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  verifyEmail: verifyOtp,       // keep backward compat alias
  verifyOtp,
  resendVerificationEmail: resendOtp,
  resendOtp,
  forgotPassword,
  verifyForgotOtp,
  resetPassword,
  changePassword,
};

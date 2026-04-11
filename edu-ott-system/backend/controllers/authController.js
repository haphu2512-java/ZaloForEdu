const crypto = require('node:crypto');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { successResponse } = require('../utils/apiResponse');
const { issueTokenPair, rotateRefreshToken, revokeAllSessions, revokeRefreshToken } = require('../services/authService');
const { sendEmail } = require('../utils/email');

const toAuthPayload = (user, tokens) => ({
  user: user.toJSON(),
  accessToken: tokens.accessToken,
  refreshToken: tokens.refreshToken,
});

const generateUsername = (identifier) => {
  const base = identifier.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${base}_${crypto.randomBytes(3).toString('hex')}`;
};

const createEmailOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const sendVerificationOtp = async ({ email, otp }) => {
  await sendEmail({
    to: email,
    subject: 'Mã OTP xác thực email - Zalo Clone',
    text: `Mã OTP xác thực email của bạn là: ${otp}. Mã có hiệu lực trong 10 phút.`,
    html: `<p>Mã OTP xác thực email của bạn là: <strong>${otp}</strong></p><p>Mã có hiệu lực trong 10 phút.</p>`,
  });
};

const register = asyncHandler(async (req, res) => {
  const { username, email, password, phone } = req.body;
  
  const query = [];
  if (email) query.push({ email: email.toLowerCase() });
  if (phone) query.push({ phone });
  if (username) query.push({ username });

  if (query.length > 0) {
    const duplicated = await User.findOne({ $or: query });
    if (duplicated) {
      if (email && duplicated.email === email.toLowerCase()) throw new ApiError(409, 'EMAIL_EXISTS', 'Email already exists');
      if (phone && duplicated.phone === phone) throw new ApiError(409, 'PHONE_EXISTS', 'Phone already exists');
      if (username && duplicated.username === username) throw new ApiError(409, 'USERNAME_EXISTS', 'Username already exists');
    }
  }

  const finalUsername = username || generateUsername(email || phone || 'user');
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Verification OTP (6 digits) for email
  let emailVerificationToken = null;
  let emailVerificationExpires = null;
  if (email) {
    emailVerificationToken = createEmailOtp();
    emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  }

  const user = await User.create({
    username: finalUsername,
    email: email ? email.toLowerCase() : undefined,
    passwordHash,
    phone: phone || undefined,
    emailVerificationToken,
    emailVerificationExpires,
  });

  if (email) {
    await sendVerificationOtp({ email, otp: emailVerificationToken }).catch((err) =>
      console.error('Failed to send verification email', err),
    );
  }

  const tokens = await issueTokenPair(user);
  return successResponse(res, toAuthPayload(user, tokens), 'Register success', 201);
});

const login = asyncHandler(async (req, res) => {
  const { email, username, phone, password } = req.body;
  
  const query = [];
  if (email) query.push({ email: email.toLowerCase() });
  if (username) query.push({ username });
  if (phone) query.push({ phone });

  const user = await User.findOne({ $or: query });
  
  if (!user || user.deletedAt) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid credentials');
  }

  const tokens = await issueTokenPair(user);
  return successResponse(res, toAuthPayload(user, tokens), 'Login success');
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const tokens = await rotateRefreshToken(token);
  const user = await User.findById(tokens.userId);
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'User not found');
  }
  return successResponse(res, toAuthPayload(user, tokens), 'Token refreshed');
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  await revokeRefreshToken(token);
  return successResponse(res, {}, 'Logout success');
});

const logoutAll = asyncHandler(async (req, res) => {
  await revokeAllSessions(req.user._id);
  return successResponse(res, {}, 'Logged out from all devices');
});

const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  
  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Verification token is invalid or has expired');
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpires = undefined;
  await user.save();

  return successResponse(res, {}, 'Email verified successfully');
});

const resendVerificationEmail = asyncHandler(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = await User.findOne({ email, deletedAt: null });
  if (!user || user.deletedAt) {
    throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
  }

  if (!user.email) {
    throw new ApiError(400, 'EMAIL_REQUIRED', 'Account does not have an email to verify');
  }

  if (user.isEmailVerified) {
    return successResponse(res, {}, 'Email already verified');
  }

  const otp = createEmailOtp();
  user.emailVerificationToken = otp;
  user.emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);
  await user.save();

  await sendVerificationOtp({ email: user.email, otp });
  return successResponse(res, {}, 'Verification OTP sent');
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;
  
  const query = [];
  if (email) query.push({ email: email.toLowerCase() });
  if (phone) query.push({ phone });

  const user = await User.findOne({ $or: query });

  if (!user) {
    // Return success to not leak email existence
    return successResponse(res, {}, 'If your account exists, a reset instruction has been sent');
  }

  const resetToken = createEmailOtp();
  user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  await user.save();

  if (email) {
    await sendEmail({
      to: user.email,
      subject: 'Mã OTP đặt lại mật khẩu - Zalo Clone',
      text: `Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là: ${resetToken}\nSử dụng mã này trong ứng dụng. Mã có hiệu lực trong 10 phút.`,
      html: `<p>Bạn đã yêu cầu đặt lại mật khẩu. Mã OTP của bạn là: <strong>${resetToken}</strong></p><p>Mã có hiệu lực trong 10 phút.</p>`,
    });
  } else if (phone) {
    // Implement SMS sending here or log
    console.log(`[SMS MOCK] To ${user.phone}: Your password reset token is ${resetToken}`);
  }

  return successResponse(res, {}, 'If your account exists, a reset instruction has been sent');
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'INVALID_TOKEN', 'Token is invalid or has expired');
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  // Increase token version to invalidate all existing sessions
  user.tokenVersion += 1;
  await user.save();

  return successResponse(res, {}, 'Password reset successfully. Please login again.');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  
  if (!user) throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is wrong');

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.tokenVersion += 1;
  await user.save();

  return successResponse(res, {}, 'Password changed successfully');
});

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  changePassword
};

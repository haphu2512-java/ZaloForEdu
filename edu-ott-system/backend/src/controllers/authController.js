const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/appError');

// ── Helper: Gắn Refresh Token vào Cookie ──
const setTokenCookie = (res, token) => {
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 ngày
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('refreshToken', token, cookieOptions);
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản.',
    data: result,
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;
  const ipAddress = req.ip;

  const { user, accessToken, refreshToken } = await authService.loginUser(email, password, ipAddress);

  // Gắn refresh token vào cookie
  setTokenCookie(res, refreshToken);

  res.status(200).json({
    status: 'success',
    data: {
      user: user.getPublicProfile(),
      token: accessToken,
      refreshToken, // Trả cả trong body cho mobile/non-cookie clients
    },
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const ipAddress = req.ip;

  await authService.logoutUser(token, ipAddress);

  // Xóa cookie
  res.cookie('refreshToken', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
    status: 'success',
    message: 'Đăng xuất thành công',
  });
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const token = req.body.refreshToken || req.cookies?.refreshToken;
  const ipAddress = req.ip;

  if (!token) {
    return next(new AppError('No refresh token provided', 400));
  }

  const { accessToken, refreshToken: newRefreshToken } = await authService.refreshUserToken(token, ipAddress);

  setTokenCookie(res, newRefreshToken);

  res.status(200).json({
    status: 'success',
    data: {
      token: accessToken,
      refreshToken: newRefreshToken,
    },
  });
});

// @desc    Verify email with OTP
// @route   POST /api/v1/auth/verify-email
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { email, otp } = req.body;
  const result = await authService.verifyUserEmail(email, otp);

  res.status(200).json({
    status: 'success',
    message: 'Email xác thực thành công',
    data: result,
  });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const profile = await authService.getMeProfile(req.user._id);
  res.status(200).json({
    status: 'success',
    data: { user: profile },
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/update-profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const updatedUser = await authService.updateProfileData(req.user._id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changeUserPassword(req.user._id, currentPassword, newPassword);
  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
    data: result,
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  await authService.forgotUserPassword(req.body.email);
  res.status(200).json({
    status: 'success',
    message: 'Email đặt lại mật khẩu đã được gửi',
  });
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const result = await authService.resetUserPassword(req.params.token, req.body.password);
  res.status(200).json({
    status: 'success',
    message: 'Đặt lại mật khẩu thành công',
    data: result,
  });
});

// @desc    Resend OTP email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
exports.resendVerification = asyncHandler(async (req, res, next) => {
  await authService.resendUserVerification(req.body.email);
  res.status(200).json({
    status: 'success',
    message: 'Mã xác thực mới đã được gửi đến email của bạn',
  });
});

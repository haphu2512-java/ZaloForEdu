const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { email, password, fullName, role } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 400));
  }

  // Create user
  const user = await User.create({
    email,
    password,
    fullName,
    role: role || 'student',
  });

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    data: {
      user: user.getPublicProfile(),
      token,
    },
  });
});

// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if user exists and get password field
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if password matches
  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    return next(new AppError('Invalid email or password', 401));
  }

  // Check if account is active
  if (!user.isActive) {
    return next(new AppError('Your account has been deactivated. Please contact support.', 401));
  }

  // Generate token
  const token = generateToken(user._id);

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    data: {
      user: user.getPublicProfile(),
      token,
    },
  });
});

// @desc    Logout user
// @route   POST /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  // In a more advanced setup, you might want to blacklist the token
  // For now, client will just remove the token from storage
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully',
  });
});

// @desc    Get current user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    status: 'success',
    data: {
      user: user.getPublicProfile(),
    },
  });
});

// @desc    Update user profile
// @route   PUT /api/v1/auth/update-profile
// @access  Private
exports.updateProfile = asyncHandler(async (req, res, next) => {
  const { fullName, avatar, phoneNumber, dateOfBirth, bio, department } = req.body;

  const updateData = {};
  if (fullName) updateData.fullName = fullName;
  if (avatar) updateData.avatar = avatar;
  if (phoneNumber) updateData.phoneNumber = phoneNumber;
  if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
  if (bio) updateData.bio = bio;
  if (department) updateData.department = department;

  const user = await User.findByIdAndUpdate(
    req.user._id,
    updateData,
    { new: true, runValidators: true }
  );


  res.status(200).json({
    status: 'success',
    data: {
      user: user.getPublicProfile(),
    },
  });
});

// @desc    Change password
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Get user with password
  const user = await User.findById(req.user._id).select('+password');

  // Check current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new AppError('Current password is incorrect', 401));
  }

  // Update password
  user.password = newPassword;
  await user.save();

  // Generate new token
  const token = generateToken(user._id);

  res.status(200).json({
    status: 'success',
    message: 'Password changed successfully',
    data: {
      token,
    },
  });
});

// @desc    Forgot password
// @route   POST /api/v1/auth/forgot-password
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return next(new AppError('No user found with this email', 404));
  }

  // Generate reset token (in production, send email with reset link)
  const resetToken = jwt.sign(
    { id: user._id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Save reset token to user (optional, for additional security)
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hour
  await user.save({ validateBeforeSave: false });

  // TODO: Send email with reset link
  // const resetUrl = `${process.env.WEB_URL}/reset-password/${resetToken}`;
  // await sendEmail({ to: user.email, subject: 'Password Reset', resetUrl });

  res.status(200).json({
    status: 'success',
    message: 'Password reset email sent',
    // For development only - remove in production
    resetToken,
  });
});

// @desc    Reset password
// @route   PUT /api/v1/auth/reset-password/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findOne({
      _id: decoded.id,
      resetPasswordToken: token,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new AppError('Invalid or expired reset token', 400));
    }

    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Generate new token
    const newToken = generateToken(user._id);

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    return next(new AppError('Invalid or expired reset token', 400));
  }
});

// @desc    Refresh access token
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refreshToken = asyncHandler(async (req, res, next) => {
  // In a more advanced setup, you would use refresh tokens stored in httpOnly cookies
  // For now, we'll just generate a new token if the old one is still valid
  
  const oldToken = req.headers.authorization?.split(' ')[1];
  if (!oldToken) {
    return next(new AppError('No token provided', 401));
  }

  try {
    const decoded = jwt.verify(oldToken, process.env.JWT_SECRET);
    const newToken = generateToken(decoded.id);

    res.status(200).json({
      status: 'success',
      data: {
        token: newToken,
      },
    });
  } catch (error) {
    return next(new AppError('Invalid token', 401));
  }
});

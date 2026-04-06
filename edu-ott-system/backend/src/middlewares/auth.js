const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// Protect routes - verify JWT token
exports.protect = asyncHandler(async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return next(new AppError('You are not logged in. Please log in to access this resource.', 401));
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    // Check if user is active
    if (!user.isActive) {
      return next(new AppError('Your account has been deactivated. Please contact support.', 401));
    }

    // Grant access to protected route
    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Invalid token. Please log in again.', 401));
  }
});

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action.', 403)
      );
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
exports.optionalAuth = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token invalid, but continue without auth
    }
  }

  next();
});

// Verify email token
exports.verifyEmailToken = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  if (!token) {
    return next(new AppError('Email verification token is required.', 400));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.emailVerificationUserId = decoded.id;
    next();
  } catch (error) {
    return next(new AppError('Invalid or expired email verification token.', 400));
  }
});

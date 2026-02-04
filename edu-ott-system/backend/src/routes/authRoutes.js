const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const validate = require('../middlewares/validate');

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('fullName').trim().notEmpty(),
    body('role').isIn(['student', 'teacher', 'admin']),
  ],
  validate,
  authController.register
);

// @route   POST /api/v1/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  validate,
  authController.login
);

// @route   POST /api/v1/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', authController.refreshToken);

// @route   POST /api/v1/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', protect, authController.logout);

// @route   GET /api/v1/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   PUT /api/v1/auth/update-profile
// @desc    Update user profile
// @access  Private
router.put(
  '/update-profile',
  protect,
  [
    body('fullName').optional().trim().notEmpty(),
    body('avatar').optional().isURL(),
  ],
  validate,
  authController.updateProfile
);

// @route   PUT /api/v1/auth/change-password
// @desc    Change password
// @access  Private
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }),
  ],
  validate,
  authController.changePassword
);

// @route   POST /api/v1/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  authController.forgotPassword
);

// @route   PUT /api/v1/auth/reset-password/:token
// @desc    Reset password with token
// @access  Public
router.put(
  '/reset-password/:token',
  [body('password').isLength({ min: 6 })],
  validate,
  authController.resetPassword
);

module.exports = router;

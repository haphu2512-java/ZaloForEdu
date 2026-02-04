const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');

// Placeholder controller - will be implemented later
const userController = {
  getAllUsers: (req, res) => res.json({ message: 'Get all users' }),
  getUser: (req, res) => res.json({ message: 'Get user by ID' }),
  updateUser: (req, res) => res.json({ message: 'Update user' }),
  deleteUser: (req, res) => res.json({ message: 'Delete user' }),
};

// All routes require authentication
router.use(protect);

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private
router.get('/', userController.getAllUsers);

// @route   GET /api/v1/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', userController.getUser);

// Admin only routes
router.use(restrictTo('admin'));

// @route   PUT /api/v1/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', userController.updateUser);

// @route   DELETE /api/v1/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', userController.deleteUser);

module.exports = router;

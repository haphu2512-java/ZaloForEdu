const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   GET /api/v1/users/search
// @desc    Search users
// @access  Private
router.get('/search', userController.searchUsers);

// @route   GET /api/v1/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', userController.getUser);

// Admin-only routes
router.use(restrictTo('admin'));

// @route   GET /api/v1/users
// @desc    Get all users
// @access  Private (Admin only)
router.get('/', userController.getAllUsers);

// @route   POST /api/v1/users/teacher
// @desc    Create teacher account
// @access  Private (Admin only)
router.post('/teacher', userController.createTeacher);

// @route   GET /api/v1/users/teachers
// @desc    Get all teachers
// @access  Private (Admin only)
router.get('/teachers', userController.getAllTeachers);

// @route   PUT /api/v1/users/:id
// @desc    Update user
// @access  Private (Admin only)
router.put('/:id', userController.updateUser);

// @route   DELETE /api/v1/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', userController.deleteUser);

module.exports = router;

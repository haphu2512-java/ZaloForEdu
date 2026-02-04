const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middlewares/auth');

// Placeholder controller
const classController = {
  getAllClasses: (req, res) => res.json({ message: 'Get all classes' }),
  createClass: (req, res) => res.json({ message: 'Create class' }),
  getClass: (req, res) => res.json({ message: 'Get class by ID' }),
  updateClass: (req, res) => res.json({ message: 'Update class' }),
  deleteClass: (req, res) => res.json({ message: 'Delete class' }),
  joinClass: (req, res) => res.json({ message: 'Join class' }),
  leaveClass: (req, res) => res.json({ message: 'Leave class' }),
  getClassMembers: (req, res) => res.json({ message: 'Get class members' }),
};

// All routes require authentication
router.use(protect);

// @route   GET /api/v1/classes
// @desc    Get all classes (for current user)
// @access  Private
router.get('/', classController.getAllClasses);

// @route   POST /api/v1/classes
// @desc    Create new class
// @access  Private (Teacher/Admin only)
router.post('/', restrictTo('teacher', 'admin'), classController.createClass);

// @route   GET /api/v1/classes/:id
// @desc    Get class by ID
// @access  Private
router.get('/:id', classController.getClass);

// @route   PUT /api/v1/classes/:id
// @desc    Update class
// @access  Private (Teacher/Admin only)
router.put('/:id', restrictTo('teacher', 'admin'), classController.updateClass);

// @route   DELETE /api/v1/classes/:id
// @desc    Delete class
// @access  Private (Teacher/Admin only)
router.delete('/:id', restrictTo('teacher', 'admin'), classController.deleteClass);

// @route   POST /api/v1/classes/:id/join
// @desc    Join a class
// @access  Private (Student)
router.post('/:id/join', classController.joinClass);

// @route   POST /api/v1/classes/:id/leave
// @desc    Leave a class
// @access  Private (Student)
router.post('/:id/leave', classController.leaveClass);

// @route   GET /api/v1/classes/:id/members
// @desc    Get class members
// @access  Private
router.get('/:id/members', classController.getClassMembers);

module.exports = router;

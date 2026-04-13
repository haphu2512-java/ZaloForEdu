const express = require('express');
const userController = require('../controllers/userController');
const { protect, restrictTo } = require('../middlewares/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

router.get('/search', userController.searchUsers);

// Put static routes before parameterized route to avoid shadowing
router.get('/teachers', restrictTo('admin'), userController.getAllTeachers);
router.post('/teacher', restrictTo('admin'), userController.createTeacher);
router.get('/', restrictTo('admin'), userController.getAllUsers);

// Any authenticated user can view a user profile by id
router.get('/:id', userController.getUser);

// Admin write operations
router.put('/:id', restrictTo('admin'), userController.updateUser);
router.delete('/:id', restrictTo('admin'), userController.deleteUser);

module.exports = router;

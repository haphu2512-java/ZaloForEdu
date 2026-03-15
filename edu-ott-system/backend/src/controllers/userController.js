const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Admin)
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const users = await userService.getAllUsers();

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private (Admin)
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// @desc    Update user
// @route   PUT /api/v1/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await userService.updateUser(req.params.id, req.body);

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  await userService.deleteUser(req.params.id);

  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
  });
});
/**
 * Dùng kiến trúc service layer.
 */
const userService = require('../services/userService');
const asyncHandler = require('../utils/asyncHandler');

// ── Standard user CRUD ──────────────

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

// @route   GET /api/v1/users/search
// @access  Private
exports.searchUsers = asyncHandler(async (req, res, next) => {
  const users = await userService.searchUsers(req.query);
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

// @route   GET /api/v1/users/:id
// @access  Private
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// @route   PUT /api/v1/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res, next) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res, next) => {
  await userService.deleteUser(req.params.id);
  res.status(200).json({
    status: 'success',
    message: 'User deleted successfully',
  });
});

// ── Teacher management ────────────

// @route   POST /api/v1/users/teacher
// @access  Private (role Admin )
exports.createTeacher = asyncHandler(async (req, res, next) => {
  const teacherUser = await userService.createTeacher(req.body);
  res.status(201).json({
    status: 'success',
    message: 'Đã tạo tài khoản giảng viên và gửi email thư mời thành công',
    data: {
      user: teacherUser.getPublicProfile(),
    },
  });
});

// @route   GET /api/v1/users/teachers
// @access  Private (role Admin)
exports.getAllTeachers = asyncHandler(async (req, res, next) => {
  const teachers = await userService.getAllTeachers();
  res.status(200).json({
    status: 'success',
    results: teachers.length,
    data: { teachers },
  });
});

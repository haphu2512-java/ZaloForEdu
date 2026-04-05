const classService = require('../services/classService');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all classes (for current user)
// @route   GET /api/v1/classes
// @access  Private
exports.getAllClasses = asyncHandler(async (req, res, next) => {
  const result = await classService.getAllClasses(req.query, req.user);

  res.status(200).json({
    status: 'success',
    results: result.classes.length,
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
    data: { classes: result.classes },
  });
});

// @desc    Create new class
// @route   POST /api/v1/classes
// @access  Private (Teacher/Admin)
exports.createClass = asyncHandler(async (req, res, next) => {
  const newClass = await classService.createClass(req.body, req.user._id);

  res.status(201).json({
    status: 'success',
    data: { class: newClass },
  });
});

// @desc    Get class by ID
// @route   GET /api/v1/classes/:id
// @access  Private
exports.getClass = asyncHandler(async (req, res, next) => {
  const classDoc = await classService.getClassById(req.params.id);

  res.status(200).json({
    status: 'success',
    data: { class: classDoc },
  });
});

// @desc    Update class
// @route   PUT /api/v1/classes/:id
// @access  Private (Teacher/Admin)
exports.updateClass = asyncHandler(async (req, res, next) => {
  const updatedClass = await classService.updateClass(req.params.id, req.body, req.user);

  res.status(200).json({
    status: 'success',
    data: { class: updatedClass },
  });
});

// @desc    Delete class
// @route   DELETE /api/v1/classes/:id
// @access  Private (Teacher/Admin)
exports.deleteClass = asyncHandler(async (req, res, next) => {
  await classService.deleteClass(req.params.id, req.user);

  res.status(200).json({
    status: 'success',
    message: 'Class deleted successfully',
  });
});

// @desc    Join a class
// @route   POST /api/v1/classes/:id/join
// @access  Private (Student)
exports.joinClass = asyncHandler(async (req, res, next) => {
  await classService.joinClass(req.params.id, req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Joined class successfully',
  });
});

// @desc    Leave a class
// @route   POST /api/v1/classes/:id/leave
// @access  Private (Student)
exports.leaveClass = asyncHandler(async (req, res, next) => {
  await classService.leaveClass(req.params.id, req.user._id);

  res.status(200).json({
    status: 'success',
    message: 'Left class successfully',
  });
});

// @desc    Get class members
// @route   GET /api/v1/classes/:id/members
// @access  Private
exports.getClassMembers = asyncHandler(async (req, res, next) => {
  const members = await classService.getClassMembers(req.params.id);

  res.status(200).json({
    status: 'success',
    data: members,
  });
});

// @desc    Add student to class (teacher/admin)
// @route   POST /api/v1/classes/:id/add-student
// @access  Private (Teacher/Admin)
exports.addStudent = asyncHandler(async (req, res, next) => {
  await classService.joinClass(req.params.id, req.body.userId);

  res.status(200).json({
    status: 'success',
    message: 'Student added successfully',
  });
});

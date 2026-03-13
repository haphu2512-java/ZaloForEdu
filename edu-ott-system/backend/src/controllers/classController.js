const Class = require('../models/Class');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get all classes (for current user)
// @route   GET /api/v1/classes
// @access  Private
exports.getAllClasses = asyncHandler(async (req, res, next) => {
  const { status, subject, search, page = 1, limit = 10 } = req.query;

  const filter = {};

  // Filter by status
  if (status) filter.status = status;

  // Filter by subject
  if (subject) filter.subject = { $regex: subject, $options: 'i' };

  // Search by name or code
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  // If student, show only their classes
  if (req.user.role === 'student') {
    filter.students = req.user._id;
  }

  // If teacher, show only their classes
  if (req.user.role === 'teacher') {
    filter.teacher = req.user._id;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const total = await Class.countDocuments(filter);

  const classes = await Class.find(filter)
    .populate('teacher', 'fullName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  res.status(200).json({
    status: 'success',
    results: classes.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / parseInt(limit)),
    data: { classes },
  });
});

// @desc    Create new class
// @route   POST /api/v1/classes
// @access  Private (Teacher/Admin)
exports.createClass = asyncHandler(async (req, res, next) => {
  // Set teacher to current user if not provided
  if (!req.body.teacher) {
    req.body.teacher = req.user._id;
  }

  const newClass = await Class.create(req.body);

  const populatedClass = await Class.findById(newClass._id)
    .populate('teacher', 'fullName email avatar');

  res.status(201).json({
    status: 'success',
    data: { class: populatedClass },
  });
});

// @desc    Get class by ID
// @route   GET /api/v1/classes/:id
// @access  Private
exports.getClass = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id)
    .populate('teacher', 'fullName email avatar')
    .populate('students', 'fullName email avatar studentId');

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { class: classDoc },
  });
});

// @desc    Update class
// @route   PUT /api/v1/classes/:id
// @access  Private (Teacher/Admin)
exports.updateClass = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id);

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  // Only the teacher of the class or an admin can update
  if (
    classDoc.teacher.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to update this class', 403));
  }

  const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('teacher', 'fullName email avatar');

  res.status(200).json({
    status: 'success',
    data: { class: updatedClass },
  });
});

// @desc    Delete class
// @route   DELETE /api/v1/classes/:id
// @access  Private (Teacher/Admin)
exports.deleteClass = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id);

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  // Only the teacher of the class or an admin can delete
  if (
    classDoc.teacher.toString() !== req.user._id.toString() &&
    req.user.role !== 'admin'
  ) {
    return next(new AppError('You are not authorized to delete this class', 403));
  }

  await Class.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// @desc    Join a class
// @route   POST /api/v1/classes/:id/join
// @access  Private (Student)
exports.joinClass = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id);

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  if (classDoc.status !== 'active') {
    return next(new AppError('This class is not currently active', 400));
  }

  // Check if already joined
  if (classDoc.students.includes(req.user._id)) {
    return next(new AppError('You are already a member of this class', 400));
  }

  // Check max students
  if (classDoc.maxStudents && classDoc.students.length >= classDoc.maxStudents) {
    return next(new AppError('This class is full', 400));
  }

  classDoc.students.push(req.user._id);
  await classDoc.save();

  res.status(200).json({
    status: 'success',
    message: 'Joined class successfully',
  });
});

// @desc    Leave a class
// @route   POST /api/v1/classes/:id/leave
// @access  Private (Student)
exports.leaveClass = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id);

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  // Check if student is in class
  const studentIndex = classDoc.students.indexOf(req.user._id);
  if (studentIndex === -1) {
    return next(new AppError('You are not a member of this class', 400));
  }

  classDoc.students.splice(studentIndex, 1);
  await classDoc.save();

  res.status(200).json({
    status: 'success',
    message: 'Left class successfully',
  });
});

// @desc    Get class members
// @route   GET /api/v1/classes/:id/members
// @access  Private
exports.getClassMembers = asyncHandler(async (req, res, next) => {
  const classDoc = await Class.findById(req.params.id)
    .populate('teacher', 'fullName email avatar role department')
    .populate('students', 'fullName email avatar studentId role department');

  if (!classDoc) {
    return next(new AppError('No class found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      teacher: classDoc.teacher,
      students: classDoc.students,
      totalMembers: classDoc.students.length + 1,
    },
  });
});

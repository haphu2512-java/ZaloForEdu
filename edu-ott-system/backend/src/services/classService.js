const Class = require('../models/Class');
const AppError = require('../utils/appError');
const { parsePagination } = require('../utils/pagination');

exports.getAllClasses = async (query, user) => {
  const { status, subject, search, page = 1, limit = 10 } = query;

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
  if (user.role === 'student') {
    filter.students = user._id;
  }

  // If teacher, show only their classes
  if (user.role === 'teacher') {
    filter.teacher = user._id;
  }

  const { page: currentPage, limit: currentLimit, skip } = parsePagination(page, limit, {
    page: 1,
    limit: 10,
  });
  const total = await Class.countDocuments(filter);

  const classes = await Class.find(filter)
    .populate('teacher', 'fullName email avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(currentLimit);

  return {
    classes,
    total,
    page: currentPage,
    totalPages: Math.ceil(total / currentLimit),
  };
};

exports.createClass = async (data, userId) => {
  // Set teacher to current user if not provided
  if (!data.teacher) {
    data.teacher = userId;
  }

  const newClass = await Class.create(data);

  const populatedClass = await Class.findById(newClass._id)
    .populate('teacher', 'fullName email avatar');

  return populatedClass;
};

exports.getClassById = async (classId) => {
  const classDoc = await Class.findById(classId)
    .populate('teacher', 'fullName email avatar')
    .populate('students', 'fullName email avatar studentId');

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  return classDoc;
};

exports.updateClass = async (classId, data, user) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  // Only the teacher of the class or an admin can update
  if (
    classDoc.teacher.toString() !== user._id.toString() &&
    user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to update this class', 403);
  }

  const updatedClass = await Class.findByIdAndUpdate(classId, data, {
    new: true,
    runValidators: true,
  }).populate('teacher', 'fullName email avatar');

  return updatedClass;
};

exports.deleteClass = async (classId, user) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  // Only the teacher of the class or an admin can delete
  if (
    classDoc.teacher.toString() !== user._id.toString() &&
    user.role !== 'admin'
  ) {
    throw new AppError('You are not authorized to delete this class', 403);
  }

  await Class.findByIdAndDelete(classId);
};

exports.joinClass = async (classId, userId) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  if (classDoc.status !== 'active') {
    throw new AppError('This class is not currently active', 400);
  }

  // Check if already joined
  if (classDoc.students.some((id) => id.toString() === userId.toString())) {
    throw new AppError('You are already a member of this class', 400);
  }

  // Check max students
  if (classDoc.maxStudents && classDoc.students.length >= classDoc.maxStudents) {
    throw new AppError('This class is full', 400);
  }

  classDoc.students.push(userId);
  await classDoc.save();
};

exports.leaveClass = async (classId, userId) => {
  const classDoc = await Class.findById(classId);

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  // Check if student is in class
  const studentIndex = classDoc.students.findIndex((id) => id.toString() === userId.toString());
  if (studentIndex === -1) {
    throw new AppError('You are not a member of this class', 400);
  }

  classDoc.students.splice(studentIndex, 1);
  await classDoc.save();
};

exports.getClassMembers = async (classId) => {
  const classDoc = await Class.findById(classId)
    .populate('teacher', 'fullName email avatar role department')
    .populate('students', 'fullName email avatar studentId role department');

  if (!classDoc) {
    throw new AppError('No class found with that ID', 404);
  }

  return {
    teacher: classDoc.teacher,
    students: classDoc.students,
    totalMembers: classDoc.students.length + 1,
  };
};

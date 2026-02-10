const Class = require('../models/Class');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');

// 1. Lấy danh sách lớp
exports.getAllClasses = asyncHandler(async (req, res, next) => {
  let filter = {};
  if (req.user.role === 'student') filter = { students: req.user._id };
  else if (req.user.role === 'teacher') filter = { teacher: req.user._id };

  const classes = await Class.find(filter).populate('teacher', 'fullName avatar');
  res.status(200).json({ status: 'success', results: classes.length, data: { classes } });
});

// 2. Tạo lớp mới
exports.createClass = asyncHandler(async (req, res, next) => {
  const newClass = await Class.create({
    ...req.body,
    teacher: req.user._id 
  });
  res.status(201).json({ status: 'success', data: { class: newClass } });
});

// 3. Xem chi tiết một lớp
exports.getClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id).populate('teacher students');
  if (!classItem) return next(new AppError('Không tìm thấy lớp học', 404));
  res.status(200).json({ status: 'success', data: { class: classItem } });
});

// 4. Tham gia lớp học
exports.joinClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id);
  if (!classItem) return next(new AppError('Lớp không tồn tại', 404));
  if (classItem.students.includes(req.user._id)) return next(new AppError('Bạn đã tham gia lớp này rồi', 400));

  classItem.students.push(req.user._id);
  await classItem.save();
  res.status(200).json({ status: 'success', message: 'Tham gia lớp thành công' });
});

// --- CÁC HÀM BỔ SUNG ĐỂ KHÔNG BỊ LỖI UNDEFINED ---
exports.updateClass = asyncHandler(async (req, res) => {
  res.json({ message: 'Tính năng cập nhật lớp đang phát triển' });
});

exports.deleteClass = asyncHandler(async (req, res) => {
  res.json({ message: 'Tính năng xóa lớp đang phát triển' });
});

exports.leaveClass = asyncHandler(async (req, res) => {
  res.json({ message: 'Tính năng rời lớp đang phát triển' });
});

exports.getClassMembers = asyncHandler(async (req, res) => {
  res.json({ message: 'Tính năng xem thành viên đang phát triển' });
});

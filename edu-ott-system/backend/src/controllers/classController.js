const Class = require('../models/Class');
const AppError = require('../utils/appError');
const asyncHandler = require('../utils/asyncHandler');
const QRCode = require('qrcode');

// 1. Lấy danh sách lớp
exports.getAllClasses = asyncHandler(async (req, res, next) => {
  let filter = {};
  // role: học sinh, chỉ thấy lớp mình đã tham gia
  if (req.user.role === 'student') {
    filter = { students: req.user._id };
  } 
  // role giáo viên, chỉ thấy lớp mình tạo
  else if (req.user.role === 'teacher') {
    filter = { teacher: req.user._id };
  }
  // Admin hiện all

  const classes = await Class.find(filter)
    .populate('teacher', 'fullName avatar email')
    .sort('-createdAt');

  res.status(200).json({
    status: 'success',
    results: classes.length,
    data: { classes }
  });
});

// 2. Tạo lớp mới
exports.createClass = asyncHandler(async (req, res, next) => {
  const newClass = await Class.create({
    ...req.body,
    teacher: req.user._id 
  });

  res.status(201).json({
    status: 'success',
    data: { class: newClass }
  });
});

// 3. Xem chi tiết một lớp
exports.getClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id)
    .populate('teacher', 'fullName avatar email')
    .populate('students', 'fullName avatar email studentId');

  if (!classItem) {
    return next(new AppError('Không tìm thấy lớp học này', 404));
  }

  res.status(200).json({
    status: 'success',
    data: { class: classItem }
  });
});

// 4. Cập nhật lớp (hạn chế chỉ giáo viên tạo lớp hoặc admin mới được sửa)
exports.updateClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id);

  if (!classItem) return next(new AppError('Lớp không tồn tại', 404));
  
  // Chặn giáo viên khác sửa lớp không phải của mình
  if (classItem.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Bạn không có quyền chỉnh sửa lớp học của người khác', 403));
  }

  const updatedClass = await Class.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: { class: updatedClass }
  });
});

// 5. Xóa lớp (Chỉ giáo viên tạo lớp đó hoặc Admin mới được xóa)
exports.deleteClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id);

  if (!classItem) return next(new AppError('Lớp không tồn tại', 404));

  if (classItem.teacher.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return next(new AppError('Bạn không có quyền xóa lớp này', 403));
  }

  await Class.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// 6. Học sinh tham gia lớp (Dùng ID lớp)
exports.joinClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id);
  if (!classItem) return next(new AppError('Lớp không tồn tại', 404));

  if (classItem.students.includes(req.user._id)) {
    return next(new AppError('Bạn đã ở trong lớp này rồi', 400));
  }

  // KIỂM TRA NẾU LỚP CẦN DUYỆT
  if (classItem.settings?.requireApproval) {
    return res.status(200).json({ 
      status: 'success', 
      message: 'Yêu cầu tham gia đã được gửi tới giảng viên' 
    });
  }

  classItem.students.push(req.user._id);
  await classItem.save();
  res.status(200).json({ status: 'success', message: 'Tham gia lớp thành công' });
});

// 7. Học sinh rời lớp
exports.leaveClass = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id);

  if (!classItem) return next(new AppError('Lớp không tồn tại', 404));

  classItem.students = classItem.students.filter(
    id => id.toString() !== req.user._id.toString()
  );
  
  await classItem.save();

  res.status(200).json({
    status: 'success',
    message: 'Đã rời khỏi lớp học'
  });
});

// 8. Xem danh sách thành viên (Lấy gọn gàng teacher & students)
exports.getClassMembers = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id)
    .select('students teacher')
    .populate('teacher students', 'fullName avatar email role studentId');

  if (!classItem) return next(new AppError('Lớp không tồn tại', 404));

  res.status(200).json({
    status: 'success',
    data: {
      teacher: classItem.teacher,
      students: classItem.students,
      memberCount: classItem.students.length
    }
  });
});
  // 9. Lấy mã QR và Link mời của lớp

exports.getClassInvite = asyncHandler(async (req, res, next) => {
  const classItem = await Class.findById(req.params.id);

  if (!classItem) return next(new AppError('Không tìm thấy lớp học', 404));

  // Nội dung mã QR: Chứa ID lớp hoặc một đường link để App Mobile/Web xử lý
  const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/join-class/${classItem._id}`;
  
  // Tạo ảnh QR dưới dạng chuỗi Base64
  const qrCodeImage = await QRCode.toDataURL(inviteLink);

  res.status(200).json({
    status: 'success',
    data: {
      className: classItem.name,
      classCode: classItem.code,
      inviteLink,
      qrCode: qrCodeImage, //  đưa vào thẻ <img src="..."> bên frontend để hiển thị
      schedule: classItem.schedule // Hiện lịch học
    }
  });
});
 
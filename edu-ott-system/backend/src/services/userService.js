/**
 * Kiến trúc service layer 
 */
const User = require('../models/User');
const AppError = require('../utils/appError');
const { sendTeacherInvitationEmail } = require('../utils/emailService');

// ── Sinh mật khẩu ngẫu nhiên an toàn ──
const generateRandomPassword = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()';
  let password = 'Aa1!';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// ── Hàm sinh mã Giảng viên tự động (VD: GV260001) ─
const generateTeacherId = async () => {
  const year = new Date().getFullYear().toString().slice(-2); // VD: '26'
  const prefix = `GV${year}`;
  
  // Tìm giáo viên có mã bắt đầu bằng prefix (VD: GV26) mới nhất
  const latestTeacher = await User.findOne({ teacherId: new RegExp(`^${prefix}`) })
    .sort({ teacherId: -1 })
    .select('teacherId');

  let nextSeq = 1;
  if (latestTeacher && latestTeacher.teacherId) {
    const lastSeqStr = latestTeacher.teacherId.replace(prefix, '');
    const lastSeq = parseInt(lastSeqStr, 10);
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1;
    }
  }
  
  // Format thành chuỗi 4 số (VD: GV260001, GV260002)
  return `${prefix}${nextSeq.toString().padStart(4, '0')}`;
};

// ── Standard user CRUD ───

exports.getAllUsers = async () => {
  const users = await User.find().select('-password');
  return users;
};

exports.searchUsers = async (query) => {
  const { q, role, limit = 20 } = query;
  if (!q || q.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const filter = {
    isActive: true,
    $or: [
      { fullName: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
      { studentId: { $regex: q, $options: 'i' } },
    ],
  };

  if (role) filter.role = role;

  const users = await User.find(filter)
    .select('fullName email avatar role studentId department')
    .limit(parseInt(limit))
    .sort({ fullName: 1 });

  return users;
};

exports.getUserById = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new AppError('No user found with that ID', 404);
  return user;
};

exports.updateUser = async (userId, updateData) => {
  delete updateData.password;
  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select('-password');
  if (!user) throw new AppError('No user found with that ID', 404);
  return user;
};

exports.deleteUser = async (userId) => {
  const user = await User.findByIdAndDelete(userId);
  if (!user) throw new AppError('No user found with that ID', 404);
};

// ── Teacher management ─────

exports.createTeacher = async ({ email, fullName, department }) => {
  if (!email || !fullName) {
    throw new AppError('Vui lòng cung cấp đầy đủ Tên và Email', 400);
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('Email này đã được sử dụng trong hệ thống', 400);
  }

  // Tự động sinh mã CBGV không trùng lặp
  const autoTeacherId = await generateTeacherId();

  const tempPassword = generateRandomPassword();

  const teacherUser = await User.create({
    email,
    password: tempPassword,
    fullName,
    teacherId: autoTeacherId,
    department: department || null,
    role: 'teacher',
    isEmailVerified: true,
    isActive: true,
  });

  try {
    await sendTeacherInvitationEmail(teacherUser.email, teacherUser.fullName, tempPassword);
  } catch (err) {
    console.error('[UserService] Failed to send teacher invitation email:', err.message);
  }

  return teacherUser;
};

exports.getAllTeachers = async () => {
  const teachers = await User.find({ role: 'teacher' })
    .select('fullName email teacherId department createdAt isActive')
    .sort({ createdAt: -1 });
  return teachers;
};

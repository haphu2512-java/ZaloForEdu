const { ZodError } = require('zod');

const logger = require('../utils/logger');

const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details || null;

  const MESSAGE_MAP = {
    'You are not a member of this group': 'Bạn không phải là thành viên của nhóm này',
    'You are not a member of this conversation': 'Bạn không phải là thành viên của cuộc trò chuyện này',
    'Only owner/admin can perform this action': 'Chỉ trưởng hoặc phó nhóm mới có quyền này',
    'Only group owner can perform this action': 'Chỉ trưởng nhóm mới có quyền này',
    'Only owner/admin can update group info': 'Chỉ trưởng hoặc phó nhóm mới được cập nhật thông tin',
    'Only admin/owner can create polls in this group': 'Chỉ trưởng hoặc phó nhóm mới được tạo bình chọn',
    'Cannot remove group owner': 'Không thể xóa trưởng nhóm',
    'Only group owner can remove other admins': 'Chỉ trưởng nhóm mới có quyền xóa phó nhóm',
    'Owner must transfer ownership before leaving group': 'Trưởng nhóm phải chuyển quyền trước khi rời nhóm',
    'Conversation not found': 'Không tìm thấy cuộc trò chuyện',
    'User not found': 'Không tìm thấy người dùng',
    'User is not in this group': 'Thành viên không có trong nhóm',
    'Member is already an admin': 'Thành viên đã là phó nhóm',
    'User is already in this group': 'Thành viên đã có trong nhóm',
    'Email already exists': 'Email này đã được sử dụng bởi tài khoản khác',
    'All users are already in the group': 'Tất cả người dùng đã có trong nhóm',
    'Direct conversation must contain exactly 2 participants': 'Cuộc trò chuyện cá nhân phải có đúng 2 người',
    'Missing Bearer token': 'Vui lòng đăng nhập lại',
    'Invalid access token': 'Phiên đăng nhập không hợp lệ',
    'Invalid payload': 'Dữ liệu không hợp lệ',
    'Validation failed': 'Xác thực dữ liệu thất bại',
    'Internal server error': 'Lỗi máy chủ',
    'File too large': 'File đính kèm vượt quá giới hạn 50MB',
    'Invalid file type': 'Loại tệp không hợp lệ',
  };

  message = MESSAGE_MAP[message] || message;

  // Multer file size error (thrown before controller)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: 'File đính kèm vượt quá giới hạn 50MB. Vui lòng chọn file nhỏ hơn.',
        details: null,
      },
    });
  }

  if (err.name === 'ValidationError') {
    message = 'Xác thực dữ liệu thất bại';
    details = err.errors;
  }

  if (err.name === 'MongoServerError' && err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const fieldMapping = {
      email: 'Email',
      phone: 'Số điện thoại',
      username: 'Tên người dùng',
    };
    const friendlyField = fieldMapping[field] || field;
    message = `${friendlyField} đã tồn tại trong hệ thống`;
    details = err.keyValue;
  }

  // Zod validation error — extract field-level messages (e.g. content max 5000)
  if (err instanceof ZodError || err.details?.name === 'ZodError') {
    const zodErr = err instanceof ZodError ? err : err.details;
    const flattened = zodErr.flatten();

    // Ưu tiên lấy message của từng field thay vì message chung "Invalid payload"
    const fieldErrors = flattened.fieldErrors;
    const firstFieldWithError = Object.keys(fieldErrors)[0];
    if (firstFieldWithError && fieldErrors[firstFieldWithError]?.length > 0) {
      message = fieldErrors[firstFieldWithError][0];
    } else {
      message = 'Dữ liệu không hợp lệ';
    }

    details = flattened;
  }

  if (statusCode >= 500) {
    logger.error({ err }, 'Unhandled server error');
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      details,
    },
  });
};

module.exports = {
  errorHandler,
};
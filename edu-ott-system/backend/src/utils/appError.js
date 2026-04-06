class AppError extends Error {
  constructor(message, statusCode, errorCode = null, data = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    // Mã lỗi chi tiết cho Frontend (VD: 'ACCOUNT_LOCKED', 'EMAIL_NOT_VERIFIED')
    if (errorCode) this.errorCode = errorCode;

    // Dữ liệu bổ sung (VD: { email, loginAttempts, lockUntil })
    if (data) {
      Object.assign(this, data);
    }

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;

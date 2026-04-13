const { ZodError } = require('zod');

const logger = require('../utils/logger');

const errorHandler = (err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  let message = err.message || 'Something went wrong';
  let details = err.details || null;

  if (err.name === 'ValidationError') {
    message = 'Validation failed';
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

  if (err instanceof ZodError) {
    message = 'Invalid payload';
    details = err.flatten();
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

const successResponse = (res, data = {}, message = 'OK', statusCode = 200) =>
  res.status(statusCode).json({
    success: true,
    data,
    message,
  });

module.exports = {
  successResponse,
};

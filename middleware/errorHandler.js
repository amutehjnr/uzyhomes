const logger = require('../config/logger');

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Something went wrong!';

  // Wrong MongoDB ID error
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid: ${err.path}`;
    err = new ApiError(400, message);
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const message = `Duplicate field value entered: ${Object.keys(err.keyValue)}`;
    err = new ApiError(400, message);
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    const message = 'Json Web Token is invalid, Try again';
    err = new ApiError(400, message);
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    const message = 'Json Web Token is expired, Try again';
    err = new ApiError(400, message);
  }

  logger.error({
    message: err.message,
    statusCode: err.statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { ApiError, globalErrorHandler };
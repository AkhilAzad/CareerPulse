const { NODE_ENV } = require('../config/env');
const { maskCredentials } = require('../config/database');

/**
 * 404 Not Found Middleware - Returns JSON for unhandled endpoints
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    status: 404,
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`,
  });
};

/**
 * Centralized Global Error Handler - Returns standardized JSON errors
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.status || err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  let message = err.message || 'Internal Server Error';

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `An account or record with this ${field} already exists.`;
  }

  // Handle Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((val) => val.message)
      .join(', ');
  }

  // Handle JWT errors if passed to next()
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication token has expired. Please log in again.';
  }

  // Handle MongoDB buffering timeout or connection errors
  if (err.name === 'MongooseError' && (err.message || '').includes('buffering timed out')) {
    statusCode = 503;
    message = 'Database service is currently unavailable. Please try again shortly.';
  } else if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    statusCode = 503;
    message = 'Database service is temporarily unreachable. Please try again shortly.';
  }

  const response = {
    success: false,
    status: statusCode,
    message: maskCredentials(message),
  };

  // Include stack trace only in development
  if (NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  // Include detailed field errors if present
  if (err.errors && err.name !== 'ValidationError') {
    response.errors = err.errors;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};

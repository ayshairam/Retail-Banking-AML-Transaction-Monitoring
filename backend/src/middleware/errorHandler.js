const logger = require('../config/logger');
const ApiError = require('../utils/ApiError');
const { failure } = require('../utils/apiResponse');

function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let error = err;

  // Translate common Mongoose errors into safe, structured API errors instead of leaking
  // internal driver messages/stack traces to the client.
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    error = ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details);
  } else if (err.name === 'CastError') {
    error = ApiError.badRequest(`Invalid identifier: ${err.value}`, 'INVALID_ID');
  } else if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    error = ApiError.conflict(`A record with this ${field} already exists`, 'DUPLICATE_RECORD');
  } else if (!(err instanceof ApiError)) {
    logger.error('Unhandled error', { message: err.message, stack: err.stack });
    error = ApiError.internal('An unexpected error occurred. Please try again later.');
  }

  if (error.statusCode >= 500) {
    logger.error(error.message, { errorCode: error.errorCode, stack: err.stack });
  } else {
    logger.warn(error.message, { errorCode: error.errorCode, path: req.originalUrl });
  }

  return failure(res, error.statusCode, error.message, error.errorCode, error.details);
}

module.exports = { notFoundHandler, errorHandler };

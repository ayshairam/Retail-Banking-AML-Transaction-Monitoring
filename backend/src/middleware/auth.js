const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/token');
const { User, RevokedToken } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Authentication middleware: requires a valid, non-expired, non-revoked JWT in the
 * Authorization: Bearer <token> header. Attaches req.user (Mongo user doc, minus passwordHash)
 * and req.token to the request.
 */
const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (!scheme || scheme !== 'Bearer' || !token) {
    throw ApiError.unauthorized('Missing authentication token', 'AUTH_TOKEN_MISSING');
  }

  const revoked = await RevokedToken.findOne({ token }).lean();
  if (revoked) {
    throw ApiError.unauthorized('Token has been revoked, please log in again', 'AUTH_TOKEN_REVOKED');
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('Token has expired, please log in again', 'AUTH_TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('Invalid authentication token', 'AUTH_TOKEN_INVALID');
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) {
    throw ApiError.unauthorized('Account not found or deactivated', 'AUTH_USER_INVALID');
  }

  req.user = user;
  req.token = token;
  req.tokenPayload = payload;
  next();
});

/**
 * Role-based authorization middleware. Usage: authorize('ADMIN'), authorize('ADMIN', 'EMPLOYEE')
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required', 'AUTH_REQUIRED'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Role '${req.user.role}' is not permitted to perform this action`,
          'INSUFFICIENT_ROLE'
        )
      );
    }
    return next();
  };
}

module.exports = { authenticate, authorize };

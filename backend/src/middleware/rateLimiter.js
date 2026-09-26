const rateLimit = require('express-rate-limit');
const { authRateLimitWindowMs, authRateLimitMax, env } = require('../config/env');
const { failure } = require('../utils/apiResponse');

// Protects login/register from brute-force and credential-stuffing attempts.
const authRateLimiter = rateLimit({
  windowMs: authRateLimitWindowMs,
  max: env === 'test' ? 10000 : authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    failure(res, 429, 'Too many attempts. Please try again later.', 'RATE_LIMIT_EXCEEDED'),
});

module.exports = { authRateLimiter };

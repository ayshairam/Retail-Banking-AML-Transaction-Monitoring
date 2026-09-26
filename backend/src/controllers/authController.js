const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const authService = require('../services/authService');

const registerHandler = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body, req);
  return success(res, 201, 'Registration successful', result);
});

const loginHandler = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body, req);
  return success(res, 200, 'Login successful', result);
});

const logoutHandler = asyncHandler(async (req, res) => {
  await authService.logout({ token: req.token, req, user: req.user });
  return success(res, 200, 'Logout successful', null);
});

const meHandler = asyncHandler(async (req, res) => {
  return success(res, 200, 'Current user', authService.sanitizeUser(req.user));
});

module.exports = { registerHandler, loginHandler, logoutHandler, meHandler };

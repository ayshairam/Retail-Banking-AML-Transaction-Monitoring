const express = require('express');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validators/authValidators');
const {
  registerHandler,
  loginHandler,
  logoutHandler,
  meHandler,
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', authRateLimiter, validate(registerSchema), registerHandler);
router.post('/login', authRateLimiter, validate(loginSchema), loginHandler);
router.post('/logout', authenticate, logoutHandler);
router.get('/me', authenticate, meHandler);

module.exports = router;

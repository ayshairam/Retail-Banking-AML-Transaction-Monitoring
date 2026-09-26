const Joi = require('joi');

// E.164-ish phone: optional leading +, 10-15 digits.
const phonePattern = /^\+?[0-9]{10,15}$/;
// At least 8 chars, one uppercase, one lowercase, one number, one special char.
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().lowercase().email().required(),
  phone: Joi.string().trim().pattern(phonePattern).required().messages({
    'string.pattern.base': 'phone must be a valid number with 10-15 digits',
  }),
  password: Joi.string().pattern(passwordPattern).required().messages({
    'string.pattern.base':
      'password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().lowercase().email().required(),
  password: Joi.string().required(),
});

module.exports = { registerSchema, loginSchema, phonePattern, passwordPattern };

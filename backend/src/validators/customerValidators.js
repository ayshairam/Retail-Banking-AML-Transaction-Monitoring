const Joi = require('joi');

const customerSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('name', 'createdAt', 'customerRiskLevel').default('createdAt'),
  sortDir: Joi.string().valid('asc', 'desc').default('desc'),
  q: Joi.string().trim().max(150).allow('', null), // free-text: name/email/phone/account number
  riskLevel: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').allow('', null),
});

const freezeSchema = Joi.object({
  reason: Joi.string().trim().max(500).allow('', null),
});

module.exports = { customerSearchSchema, freezeSchema };

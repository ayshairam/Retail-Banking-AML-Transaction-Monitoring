const Joi = require('joi');
const { ALERT_STATUS, ALERT_SEVERITY, RULE_TYPE } = require('../utils/constants');

const alertSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('createdAt', 'riskScore', 'status').default('createdAt'),
  sortDir: Joi.string().valid('asc', 'desc').default('desc'),
  status: Joi.string()
    .valid(...Object.values(ALERT_STATUS))
    .allow('', null),
  severity: Joi.string()
    .valid(...Object.values(ALERT_SEVERITY))
    .allow('', null),
  riskLevel: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').allow('', null),
  customerId: Joi.string().hex().length(24).allow('', null),
});

const reviewAlertSchema = Joi.object({
  status: Joi.string()
    .valid(ALERT_STATUS.UNDER_REVIEW, ALERT_STATUS.CLEARED, ALERT_STATUS.CONFIRMED_SUSPICIOUS)
    .required(),
  reviewNotes: Joi.string().trim().max(2000).required(),
});

const updateRuleSchema = Joi.object({
  ruleName: Joi.string().trim().max(100),
  description: Joi.string().trim().max(1000),
  enabled: Joi.boolean(),
  threshold: Joi.number().min(0).allow(null),
  timeWindowMinutes: Joi.number().integer().min(1).allow(null),
  minTransactionCount: Joi.number().integer().min(1).allow(null),
  severity: Joi.string().valid(...Object.values(ALERT_SEVERITY)),
  config: Joi.object().unknown(true),
}).min(1);

const toggleRuleSchema = Joi.object({
  enabled: Joi.boolean().required(),
});

module.exports = { alertSearchSchema, reviewAlertSchema, updateRuleSchema, toggleRuleSchema, RULE_TYPE };

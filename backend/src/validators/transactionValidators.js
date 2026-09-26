const Joi = require('joi');
const { TRANSACTION_TYPE } = require('../utils/constants');

const createTransactionSchema = Joi.object({
  accountId: Joi.string().hex().length(24).required(),
  type: Joi.string()
    .valid(...Object.values(TRANSACTION_TYPE))
    .required(),
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().valid('INR').default('INR'),
  location: Joi.string().trim().max(100).default('Bengaluru, IN'),
  description: Joi.string().trim().max(255).allow('', null),
  destinationAccountNumber: Joi.string().trim().when('type', {
    is: 'TRANSFER',
    then: Joi.required(),
    otherwise: Joi.optional().allow(null, ''),
  }),
  counterpartyName: Joi.string().trim().max(100).allow('', null),
  idempotencyKey: Joi.string().trim().max(100).allow('', null),
});

const transactionSearchSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string()
    .valid('timestamp', 'amount', 'riskScore', 'createdAt')
    .default('timestamp'),
  sortDir: Joi.string().valid('asc', 'desc').default('desc'),
  transactionId: Joi.string().trim().allow('', null),
  accountId: Joi.string().hex().length(24).allow('', null),
  customerId: Joi.string().hex().length(24).allow('', null),
  type: Joi.string()
    .valid(...Object.values(TRANSACTION_TYPE))
    .allow('', null),
  status: Joi.string().allow('', null),
  minAmount: Joi.number().min(0).allow(null, ''),
  maxAmount: Joi.number().min(0).allow(null, ''),
  startDate: Joi.date().iso().allow(null, ''),
  endDate: Joi.date().iso().allow(null, ''),
  riskLevel: Joi.string().valid('LOW', 'MEDIUM', 'HIGH', 'CRITICAL').allow('', null),
  isSuspicious: Joi.string().valid('true', 'false').allow('', null),
});

module.exports = { createTransactionSchema, transactionSearchSchema };

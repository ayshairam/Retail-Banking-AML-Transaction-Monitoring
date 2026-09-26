const Joi = require('joi');

const statementSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).required(),
  format: Joi.string().valid('pdf', 'csv').default('pdf'),
});

module.exports = { statementSchema };

const ApiError = require('../utils/ApiError');

/**
 * Generic Joi-schema validation middleware factory.
 * source: 'body' | 'query' | 'params'
 */
function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });
    if (error) {
      const details = error.details.map((d) => d.message.replace(/"/g, ''));
      return next(ApiError.badRequest('Validation failed', 'VALIDATION_ERROR', details));
    }
    req[source] = value;
    return next();
  };
}

module.exports = validate;

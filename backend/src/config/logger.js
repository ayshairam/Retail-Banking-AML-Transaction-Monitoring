const winston = require('winston');
const { env, logLevel } = require('./env');

// Redact common sensitive keys from logged metadata so secrets never hit the log stream.
const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'jwt', 'secret', 'accessToken', 'refreshToken'];

function redact(meta) {
  if (!meta || typeof meta !== 'object') return meta;
  const clone = Array.isArray(meta) ? [...meta] : { ...meta };
  Object.keys(clone).forEach((key) => {
    if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
      clone[key] = '[REDACTED]';
    } else if (typeof clone[key] === 'object' && clone[key] !== null) {
      clone[key] = redact(clone[key]);
    }
  });
  return clone;
}

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const safeMeta = redact(meta);
      const metaStr = Object.keys(safeMeta).length ? ` ${JSON.stringify(safeMeta)}` : '';
      return `${timestamp} [${level.toUpperCase()}] ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console({ silent: env === 'test' })],
});

module.exports = logger;

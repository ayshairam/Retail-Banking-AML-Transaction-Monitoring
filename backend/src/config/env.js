require('dotenv').config();

const required = ['JWT_SECRET'];

if (process.env.NODE_ENV !== 'test') {
  required.forEach((key) => {
    if (!process.env[key]) {
      // eslint-disable-next-line no-console
      console.warn(`[config] Warning: environment variable ${key} is not set. Using an insecure default is NOT safe for production.`);
    }
  });
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cba_banking_aml',
  jwtSecret: process.env.JWT_SECRET || 'dev_only_insecure_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  authRateLimitWindowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
  authRateLimitMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 10,
  logLevel: process.env.LOG_LEVEL || 'info',
};

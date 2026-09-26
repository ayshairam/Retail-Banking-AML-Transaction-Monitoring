const app = require('./app');
const { port } = require('./config/env');
const { connectDB } = require('./config/db');
const logger = require('./config/logger');

async function start() {
  try {
    await connectDB();
    app.listen(port, () => {
      logger.info(`CBA Banking & AML API listening on port ${port}`);
    });
  } catch (err) {
    logger.error('Failed to start server', { message: err.message });
    process.exit(1);
  }
}

start();

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { message: reason?.message || String(reason) });
});

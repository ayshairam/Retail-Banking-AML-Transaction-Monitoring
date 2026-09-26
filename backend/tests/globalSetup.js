const { MongoMemoryReplSet } = require('mongodb-memory-server');

/**
 * Runs once for the entire test run. Uses a single-node replica set (not a bare standalone
 * instance) specifically so the multi-document transaction path in transactionService.js
 * (session.withTransaction) is exercised by the integration tests, not just its fallback.
 *
 * If MONGO_URI is already set in the environment (e.g. pointed at a real MongoDB replica set
 * or Atlas cluster), that is used instead and no in-memory server is downloaded/started.
 *
 * If neither is available (e.g. a sandboxed CI environment with no outbound access to
 * download the mongod binary), DB-dependent integration tests are skipped gracefully -
 * see tests/dbAvailable.js - while all DB-independent unit tests still run normally.
 */
module.exports = async function globalSetup() {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_do_not_use_in_production';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

  if (process.env.MONGO_URI) {
    process.env.CBA_DB_AVAILABLE = 'true';
    return;
  }

  try {
    const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
    await replSet.waitUntilRunning();
    global.__MONGO_REPLSET__ = replSet;
    process.env.MONGO_URI = replSet.getUri('cba_banking_aml_test');
    process.env.CBA_DB_AVAILABLE = 'true';
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `\n[tests] Could not start an in-memory MongoDB instance (${err.message}).\n` +
        '[tests] DB-dependent integration tests will be skipped. Unit tests are unaffected.\n' +
        '[tests] To run the full suite, provide MONGO_URI for a reachable MongoDB replica set,\n' +
        '[tests] or run in an environment with outbound access to fastdl.mongodb.org.\n'
    );
    process.env.CBA_DB_AVAILABLE = 'false';
  }
};

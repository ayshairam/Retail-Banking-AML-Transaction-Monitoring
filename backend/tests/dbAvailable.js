// Shared helper: true when a real/in-memory MongoDB is reachable for this test run.
// Integration/API/e2e test files should guard their top-level describe with this, e.g.:
//   const dbIt = require('../dbAvailable').dbDescribe;
//   dbIt('Auth API', () => { ... });
// so the suite is skipped (not failed) in environments with no outbound access to download
// the mongodb-memory-server binary and no MONGO_URI override.
const dbAvailable = process.env.CBA_DB_AVAILABLE === 'true';

function dbDescribe(name, fn) {
  return (dbAvailable ? describe : describe.skip)(name, fn);
}

module.exports = { dbAvailable, dbDescribe };

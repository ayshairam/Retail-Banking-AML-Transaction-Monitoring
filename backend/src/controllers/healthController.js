const mongoose = require('mongoose');
const { success } = require('../utils/apiResponse');
const { getConnectionState } = require('../config/db');

function healthHandler(_req, res) {
  const dbState = getConnectionState();
  const dbConnected = mongoose.connection.readyState === 1;
  return success(res, 200, 'OK', {
    status: 'UP',
    database: { status: dbState, connected: dbConnected },
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
  });
}

module.exports = { healthHandler };

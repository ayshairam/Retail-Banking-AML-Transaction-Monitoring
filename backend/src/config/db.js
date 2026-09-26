const mongoose = require('mongoose');
const { mongoUri } = require('./env');
const logger = require('./logger');

let isConnected = false;

async function connectDB(uri = mongoUri) {
  if (isConnected) return mongoose.connection;
  try {
    await mongoose.connect(uri, {
      autoIndex: true,
    });
    isConnected = true;
    logger.info(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
    return mongoose.connection;
  } catch (err) {
    logger.error('MongoDB connection error', { message: err.message });
    throw err;
  }
}

async function disconnectDB() {
  if (!isConnected) return;
  await mongoose.disconnect();
  isConnected = false;
}

function getConnectionState() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, disconnectDB, getConnectionState };

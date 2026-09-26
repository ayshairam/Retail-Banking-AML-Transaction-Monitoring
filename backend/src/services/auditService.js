const { AuditLog } = require('../models');
const logger = require('../config/logger');
const { getRequestMeta } = require('../utils/requestMeta');

/**
 * Persists an audit log entry. Never throws - audit logging must not break the primary
 * operation it is recording, so failures are caught and logged instead of propagated.
 */
async function record({ req, user, action, entityType, entityId, oldValue = null, newValue = null, success = true, message = null }) {
  try {
    const meta = req ? getRequestMeta(req) : {};
    await AuditLog.create({
      user: user?._id || req?.user?._id || null,
      userEmail: user?.email || req?.user?.email || null,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      oldValue,
      newValue,
      ipAddress: meta.ipAddress || null,
      userAgent: meta.userAgent || null,
      success,
      message,
    });
  } catch (err) {
    logger.error('Failed to write audit log', { action, entityType, message: err.message });
  }
}

module.exports = { record };

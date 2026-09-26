const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // null for unauthenticated attempts (e.g. failed login)
    userEmail: { type: String, default: null },
    action: { type: String, required: true }, // e.g. LOGIN, REGISTER, ACCOUNT_FREEZE, ALERT_REVIEW
    entityType: { type: String, required: true }, // e.g. User, Account, AmlAlert, AmlRule, Transaction
    entityId: { type: String, default: null },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    success: { type: Boolean, default: true },
    message: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.index({ action: 1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ user: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);

const mongoose = require('mongoose');
const { ALERT_STATUS, ALERT_SEVERITY, RISK_LEVEL } = require('../utils/constants');

const triggeredRuleSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true },
    ruleName: { type: String, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

// One alert per transaction event. If several rules fire for the same transaction they are
// correlated into a single alert (triggeredRules array) rather than creating duplicate alerts -
// see backend/src/aml/engine.js `correlateAlert`.
const amlAlertSchema = new mongoose.Schema(
  {
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    triggeredRules: { type: [triggeredRuleSchema], default: [] },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: Object.values(RISK_LEVEL), required: true },
    severity: { type: String, enum: Object.values(ALERT_SEVERITY), required: true },
    reason: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ALERT_STATUS),
      default: ALERT_STATUS.OPEN,
    },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewNotes: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

amlAlertSchema.index({ transaction: 1 }, { unique: true });
amlAlertSchema.index({ customer: 1 });
amlAlertSchema.index({ account: 1 });
amlAlertSchema.index({ status: 1 });
amlAlertSchema.index({ riskLevel: 1 });
amlAlertSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AmlAlert', amlAlertSchema);

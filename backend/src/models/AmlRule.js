const mongoose = require('mongoose');
const { RULE_TYPE, ALERT_SEVERITY } = require('../utils/constants');

// Database-backed, admin-configurable AML rule definitions. The AML engine loads active
// rules from this collection at evaluation time - no threshold or window is hard-coded
// in application logic. See backend/src/aml/rules/*.js.
const amlRuleSchema = new mongoose.Schema(
  {
    ruleCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    ruleName: { type: String, required: true },
    description: { type: String, required: true },
    ruleType: { type: String, enum: Object.values(RULE_TYPE), required: true },
    enabled: { type: Boolean, default: true },
    // Generic numeric threshold (e.g. amount for LARGE_TRANSACTION, reporting threshold for STRUCTURING)
    threshold: { type: Number, default: null },
    // Rolling time window in minutes (HIGH_FREQUENCY, STRUCTURING)
    timeWindowMinutes: { type: Number, default: null },
    // Minimum number of transactions required within the window (HIGH_FREQUENCY, STRUCTURING)
    minTransactionCount: { type: Number, default: null },
    // Free-form extra configuration, e.g. { percentBelowThreshold: 5 } for STRUCTURING
    config: { type: mongoose.Schema.Types.Mixed, default: {} },
    severity: { type: String, enum: Object.values(ALERT_SEVERITY), default: ALERT_SEVERITY.MEDIUM },
  },
  { timestamps: true }
);

amlRuleSchema.index({ enabled: 1 });
amlRuleSchema.index({ ruleType: 1 });

module.exports = mongoose.model('AmlRule', amlRuleSchema);

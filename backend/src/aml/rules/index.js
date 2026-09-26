const largeTransaction = require('./largeTransaction');
const highFrequency = require('./highFrequency');
const structuring = require('./structuring');

// Registry mapping AmlRule.ruleType -> the rule module that knows how to evaluate it.
// Adding a new rule type only requires: 1) a new module here, 2) register it below,
// 3) insert/seed a corresponding AmlRule document. No other application code changes.
module.exports = {
  LARGE_TRANSACTION: largeTransaction,
  HIGH_FREQUENCY: highFrequency,
  STRUCTURING: structuring,
};

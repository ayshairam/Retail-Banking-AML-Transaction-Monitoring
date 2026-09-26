/**
 * LARGE_TRANSACTION rule.
 * Flags a transaction when its amount is strictly greater than the configured threshold.
 * Boundary: amount === threshold does NOT trigger (₹10,00,000 exactly does not trigger when
 * threshold=1,000,000); amount === threshold + 1 DOES trigger.
 */
module.exports = {
  ruleType: 'LARGE_TRANSACTION',
  async evaluate({ transaction, rule }) {
    if (rule.threshold == null) return { triggered: false };
    const threshold = rule.threshold;
    const triggered = transaction.amount > threshold;
    return {
      triggered,
      reason: triggered
        ? `Transaction amount of ₹${transaction.amount.toLocaleString('en-IN')} exceeded the configured large-transaction reporting threshold of ₹${threshold.toLocaleString('en-IN')}.`
        : null,
      meta: { threshold, amount: transaction.amount },
    };
  },
};

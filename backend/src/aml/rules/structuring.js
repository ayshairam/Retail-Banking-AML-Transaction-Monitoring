/**
 * STRUCTURING rule (threshold avoidance).
 *
 * Detects a customer making multiple transactions that each individually sit just below the
 * large-transaction reporting threshold, within a monitoring window - classic "smurfing"
 * behaviour designed to stay under the LARGE_TRANSACTION rule.
 *
 * A transaction is "in-band" when:
 *   threshold * (1 - percentBelowThreshold/100)  <=  amount  <  threshold
 *
 * The rule triggers when `minTransactionCount` or more in-band transactions for the same
 * customer fall inside the rolling `timeWindowMinutes` window ending at the current
 * transaction (inclusive).
 *
 * Defaults: threshold=1,000,000, percentBelowThreshold=10 (band: 9,00,000 - 9,99,999.99),
 * minTransactionCount=3, timeWindowMinutes=1440 (24 hours).
 *
 * Example: ₹9,80,000 / ₹9,75,000 / ₹9,90,000 / ₹9,95,000 all fall in the default band and,
 * once 3+ of them occur within the window, the rule triggers.
 */
module.exports = {
  ruleType: 'STRUCTURING',
  async evaluate({ transaction, rule, deps }) {
    const threshold = rule.threshold ?? 1000000;
    const percentBelowThreshold = rule.config?.percentBelowThreshold ?? 10;
    const minCount = rule.minTransactionCount ?? 3;
    const windowMinutes = rule.timeWindowMinutes ?? 1440;
    const lowerBound = threshold * (1 - percentBelowThreshold / 100);

    const inBand = transaction.amount >= lowerBound && transaction.amount < threshold;
    if (!inBand) {
      return { triggered: false };
    }

    const windowStart = new Date(transaction.timestamp.getTime() - windowMinutes * 60 * 1000);
    const count = await deps.Transaction.countDocuments({
      customer: transaction.customer,
      timestamp: { $gt: windowStart, $lte: transaction.timestamp },
      amount: { $gte: lowerBound, $lt: threshold },
      status: { $ne: 'FAILED' },
    });

    const triggered = count >= minCount;
    return {
      triggered,
      reason: triggered
        ? `${count} transactions between ₹${Math.round(lowerBound).toLocaleString('en-IN')} and ₹${threshold.toLocaleString('en-IN')} (within ${percentBelowThreshold}% of the reporting threshold) were detected for this customer within the configured ${windowMinutes}-minute monitoring period, consistent with structuring/threshold-avoidance behaviour.`
        : null,
      meta: { count, lowerBound, threshold, windowMinutes, minCount },
    };
  },
};

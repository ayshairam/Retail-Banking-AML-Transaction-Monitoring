/**
 * HIGH_FREQUENCY rule.
 * Flags a customer when `minTransactionCount` or more transactions occur within a rolling
 * `timeWindowMinutes` window ending at (and including) the current transaction.
 *
 * The window is a true rolling window - (currentTime - timeWindowMinutes, currentTime] - not a
 * calendar-minute bucket, so it correctly counts transactions relative to the moment each new
 * transaction occurs, and a transaction exactly `timeWindowMinutes` in the past falls just
 * outside the window.
 *
 * Default: minTransactionCount=6 (i.e. "more than 5"), timeWindowMinutes=10.
 */
module.exports = {
  ruleType: 'HIGH_FREQUENCY',
  async evaluate({ transaction, rule, deps }) {
    const windowMinutes = rule.timeWindowMinutes ?? 10;
    const minCount = rule.minTransactionCount ?? 6;
    const windowStart = new Date(transaction.timestamp.getTime() - windowMinutes * 60 * 1000);

    const count = await deps.Transaction.countDocuments({
      customer: transaction.customer,
      timestamp: { $gt: windowStart, $lte: transaction.timestamp },
      status: { $ne: 'FAILED' },
    });

    const triggered = count >= minCount;
    return {
      triggered,
      reason: triggered
        ? `${count} transactions detected for this customer within the configured rolling ${windowMinutes}-minute window (trigger threshold: ${minCount}+).`
        : null,
      meta: { count, windowMinutes, minCount },
    };
  },
};

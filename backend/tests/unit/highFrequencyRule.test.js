const highFrequencyRule = require('../../src/aml/rules/highFrequency');

/**
 * Fake Transaction model that filters a fixed list of timestamps the same way MongoDB would
 * for the query the rule builds, so we can test the rolling-window arithmetic itself without
 * a real database.
 */
function fakeTransactionModel(timestamps) {
  return {
    countDocuments: jest.fn(async (query) => {
      const { $gt, $lte } = query.timestamp;
      return timestamps.filter((t) => t.getTime() > $gt.getTime() && t.getTime() <= $lte.getTime()).length;
    }),
  };
}

const NOW = new Date('2026-01-01T12:00:00.000Z');
const rule = { timeWindowMinutes: 10, minTransactionCount: 6 };

function minutesAgo(mins) {
  return new Date(NOW.getTime() - mins * 60 * 1000);
}

describe('HIGH_FREQUENCY rule', () => {
  test('exactly 5 transactions within the window does NOT trigger', async () => {
    // 4 prior + the current one = 5 total, all within the last 10 minutes.
    const timestamps = [minutesAgo(8), minutesAgo(6), minutesAgo(4), minutesAgo(2), NOW];
    const deps = { Transaction: fakeTransactionModel(timestamps) };
    const result = await highFrequencyRule.evaluate({
      transaction: { customer: 'c1', timestamp: NOW },
      rule,
      deps,
    });
    expect(result.triggered).toBe(false);
    expect(result.meta.count).toBe(5);
  });

  test('exactly 6 transactions within the window DOES trigger', async () => {
    const timestamps = [minutesAgo(9), minutesAgo(7), minutesAgo(5), minutesAgo(3), minutesAgo(1), NOW];
    const deps = { Transaction: fakeTransactionModel(timestamps) };
    const result = await highFrequencyRule.evaluate({
      transaction: { customer: 'c1', timestamp: NOW },
      rule,
      deps,
    });
    expect(result.triggered).toBe(true);
    expect(result.meta.count).toBe(6);
  });

  test('a transaction just outside the 10-minute window is excluded from the count', async () => {
    // One transaction at 10 min 1 sec ago must NOT count, keeping total at 5 (not triggered).
    const timestamps = [
      new Date(NOW.getTime() - (10 * 60 * 1000 + 1000)), // just outside
      minutesAgo(8),
      minutesAgo(6),
      minutesAgo(4),
      minutesAgo(2),
      NOW,
    ];
    const deps = { Transaction: fakeTransactionModel(timestamps) };
    const result = await highFrequencyRule.evaluate({
      transaction: { customer: 'c1', timestamp: NOW },
      rule,
      deps,
    });
    expect(result.meta.count).toBe(5);
    expect(result.triggered).toBe(false);
  });

  test('a transaction exactly on the window boundary (exactly timeWindowMinutes ago) is excluded', async () => {
    // The window is (now - 10min, now] - a transaction at precisely now-10min is NOT included.
    const timestamps = [minutesAgo(10), minutesAgo(8), minutesAgo(6), minutesAgo(4), minutesAgo(2), NOW];
    const deps = { Transaction: fakeTransactionModel(timestamps) };
    const result = await highFrequencyRule.evaluate({
      transaction: { customer: 'c1', timestamp: NOW },
      rule,
      deps,
    });
    expect(result.meta.count).toBe(5);
    expect(result.triggered).toBe(false);
  });

  test('respects a configurable window and count (not hard-coded)', async () => {
    const customRule = { timeWindowMinutes: 5, minTransactionCount: 3 };
    const timestamps = [minutesAgo(4), minutesAgo(2), NOW];
    const deps = { Transaction: fakeTransactionModel(timestamps) };
    const result = await highFrequencyRule.evaluate({
      transaction: { customer: 'c1', timestamp: NOW },
      rule: customRule,
      deps,
    });
    expect(result.triggered).toBe(true);
  });
});

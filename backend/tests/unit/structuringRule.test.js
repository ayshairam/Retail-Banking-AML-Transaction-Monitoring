const structuringRule = require('../../src/aml/rules/structuring');

function fakeTransactionModel(records) {
  // records: [{ amount, timestamp }]
  return {
    countDocuments: jest.fn(async (query) => {
      const { $gt, $lte } = query.timestamp;
      const { $gte: amtGte, $lt: amtLt } = query.amount;
      return records.filter(
        (r) =>
          r.timestamp.getTime() > $gt.getTime() &&
          r.timestamp.getTime() <= $lte.getTime() &&
          r.amount >= amtGte &&
          r.amount < amtLt
      ).length;
    }),
  };
}

const NOW = new Date('2026-01-01T12:00:00.000Z');
const rule = {
  threshold: 1000000,
  timeWindowMinutes: 1440,
  minTransactionCount: 3,
  config: { percentBelowThreshold: 10 },
};

function minutesAgo(mins) {
  return new Date(NOW.getTime() - mins * 60 * 1000);
}

describe('STRUCTURING rule', () => {
  test('the classic example (980000/975000/990000/995000) triggers once the 3rd in-band transaction occurs', async () => {
    const records = [
      { amount: 980000, timestamp: minutesAgo(60) },
      { amount: 975000, timestamp: minutesAgo(40) },
      { amount: 990000, timestamp: NOW },
    ];
    const deps = { Transaction: fakeTransactionModel(records) };
    const result = await structuringRule.evaluate({
      transaction: { customer: 'c1', amount: 990000, timestamp: NOW },
      rule,
      deps,
    });
    expect(result.triggered).toBe(true);
    expect(result.meta.count).toBe(3);
  });

  test('only 2 in-band transactions does NOT trigger (below minTransactionCount)', async () => {
    const records = [
      { amount: 980000, timestamp: minutesAgo(60) },
      { amount: 975000, timestamp: NOW },
    ];
    const deps = { Transaction: fakeTransactionModel(records) };
    const result = await structuringRule.evaluate({
      transaction: { customer: 'c1', amount: 975000, timestamp: NOW },
      rule,
      deps,
    });
    expect(result.triggered).toBe(false);
  });

  test('a transaction AT the reporting threshold is not in-band (handled by LARGE_TRANSACTION instead)', async () => {
    const deps = { Transaction: fakeTransactionModel([]) };
    const result = await structuringRule.evaluate({
      transaction: { customer: 'c1', amount: 1000000, timestamp: NOW },
      rule,
      deps,
    });
    expect(result.triggered).toBe(false);
  });

  test('a transaction well below the structuring band is not in-band and does not trigger', async () => {
    const deps = { Transaction: fakeTransactionModel([]) };
    const result = await structuringRule.evaluate({
      transaction: { customer: 'c1', amount: 50000, timestamp: NOW },
      rule,
      deps,
    });
    expect(result.triggered).toBe(false);
    expect(deps.Transaction.countDocuments).not.toHaveBeenCalled();
  });

  test('transactions outside the monitoring window are not counted', async () => {
    const records = [
      { amount: 980000, timestamp: minutesAgo(1440 + 10) }, // just outside 24h window
      { amount: 975000, timestamp: minutesAgo(30) },
      { amount: 990000, timestamp: NOW }, // the current transaction itself, already persisted
    ];
    const deps = { Transaction: fakeTransactionModel(records) };
    const result = await structuringRule.evaluate({
      transaction: { customer: 'c1', amount: 990000, timestamp: NOW },
      rule,
      deps,
    });
    // only 2 of the 3 (the old one is excluded) -> below threshold count of 3
    expect(result.meta.count).toBe(2);
    expect(result.triggered).toBe(false);
  });

  test('respects a configurable percentBelowThreshold band', async () => {
    const looseRule = { ...rule, config: { percentBelowThreshold: 2 } };
    const deps = { Transaction: fakeTransactionModel([]) };
    // 900000 is 10% below threshold - outside a tighter 2% band (980000-999999.99)
    const result = await structuringRule.evaluate({
      transaction: { customer: 'c1', amount: 900000, timestamp: NOW },
      rule: looseRule,
      deps,
    });
    expect(result.triggered).toBe(false);
  });
});

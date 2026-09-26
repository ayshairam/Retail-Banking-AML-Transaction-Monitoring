const largeTransactionRule = require('../../src/aml/rules/largeTransaction');

describe('LARGE_TRANSACTION rule', () => {
  const rule = { threshold: 1000000 };

  test('₹10,00,000 exactly does NOT trigger (not strictly greater than threshold)', async () => {
    const result = await largeTransactionRule.evaluate({
      transaction: { amount: 1000000 },
      rule,
    });
    expect(result.triggered).toBe(false);
  });

  test('₹10,00,001 DOES trigger (strictly greater than threshold)', async () => {
    const result = await largeTransactionRule.evaluate({
      transaction: { amount: 1000001 },
      rule,
    });
    expect(result.triggered).toBe(true);
    expect(result.reason).toMatch(/exceeded/i);
  });

  test('an amount well below the threshold does not trigger', async () => {
    const result = await largeTransactionRule.evaluate({
      transaction: { amount: 50000 },
      rule,
    });
    expect(result.triggered).toBe(false);
  });

  test('a much larger amount triggers', async () => {
    const result = await largeTransactionRule.evaluate({
      transaction: { amount: 5000000 },
      rule,
    });
    expect(result.triggered).toBe(true);
  });

  test('respects a different configured threshold (no hard-coded value)', async () => {
    const customRule = { threshold: 500000 };
    const below = await largeTransactionRule.evaluate({ transaction: { amount: 500000 }, rule: customRule });
    const above = await largeTransactionRule.evaluate({ transaction: { amount: 500001 }, rule: customRule });
    expect(below.triggered).toBe(false);
    expect(above.triggered).toBe(true);
  });

  test('does not trigger when no threshold is configured', async () => {
    const result = await largeTransactionRule.evaluate({
      transaction: { amount: 9999999 },
      rule: { threshold: null },
    });
    expect(result.triggered).toBe(false);
  });
});

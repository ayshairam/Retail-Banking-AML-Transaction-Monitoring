const {
  calculateRiskScore,
  classifyRiskLevel,
  computeAmountRisk,
} = require('../../src/aml/riskScoring');

describe('classifyRiskLevel boundaries', () => {
  test.each([
    [0, 'LOW'],
    [30, 'LOW'],
    [31, 'MEDIUM'],
    [60, 'MEDIUM'],
    [61, 'HIGH'],
    [80, 'HIGH'],
    [81, 'CRITICAL'],
    [100, 'CRITICAL'],
  ])('score %i -> %s', (score, expected) => {
    expect(classifyRiskLevel(score)).toBe(expected);
  });
});

describe('computeAmountRisk', () => {
  test('caps at 30 even for amounts far above threshold', () => {
    expect(computeAmountRisk(10000000, { threshold: 1000000 })).toBe(30);
  });

  test('scales linearly below threshold', () => {
    expect(computeAmountRisk(500000, { threshold: 1000000 })).toBe(15);
  });

  test('returns 0 when amount is 0', () => {
    expect(computeAmountRisk(0, { threshold: 1000000 })).toBe(0);
  });
});

function makeDeps({ frequencyCount = 0, locationEntry = null, confirmedSuspiciousCount = 0 } = {}) {
  return {
    Transaction: { countDocuments: jest.fn(async () => frequencyCount) },
    LocationRisk: { findOne: jest.fn(() => ({ lean: async () => locationEntry })) },
    AmlAlert: { countDocuments: jest.fn(async () => confirmedSuspiciousCount) },
  };
}

const ruleConfigByType = {
  LARGE_TRANSACTION: { threshold: 1000000 },
  HIGH_FREQUENCY: { timeWindowMinutes: 10, minTransactionCount: 6 },
};

describe('calculateRiskScore (component composition)', () => {
  const baseTransaction = { amount: 100000, location: 'Bengaluru, IN', timestamp: new Date(), customer: 'c1' };
  const baseCustomer = { _id: 'c1', customerRiskLevel: 'LOW', knownLocations: ['Bengaluru, IN'] };
  const oldAccount = { createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000) }; // > 30 days old

  test('total score never exceeds 100 even at maximum plausible risk', async () => {
    const deps = makeDeps({
      frequencyCount: 20,
      locationEntry: { riskScore: 20 },
      confirmedSuspiciousCount: 10,
    });
    const result = await calculateRiskScore({
      transaction: { ...baseTransaction, amount: 50000000 },
      customer: { ...baseCustomer, customerRiskLevel: 'CRITICAL' },
      account: { createdAt: new Date() }, // new account too
      ruleConfigByType,
      deps,
    });
    expect(result.totalScore).toBeLessThanOrEqual(100);
    expect(result.breakdown.amountRisk).toBeLessThanOrEqual(30);
    expect(result.breakdown.frequencyRisk).toBeLessThanOrEqual(30);
    expect(result.breakdown.locationRisk).toBeLessThanOrEqual(20);
    expect(result.breakdown.customerRisk).toBeLessThanOrEqual(20);
  });

  test('total score never falls below 0 for a minimal-risk transaction', async () => {
    const deps = makeDeps({ frequencyCount: 1, locationEntry: { riskScore: 0 }, confirmedSuspiciousCount: 0 });
    const result = await calculateRiskScore({
      transaction: { ...baseTransaction, amount: 1 },
      customer: baseCustomer,
      account: oldAccount,
      ruleConfigByType,
      deps,
    });
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
    expect(result.riskLevel).toBe('LOW');
  });

  test('an unfamiliar location not in the configured table scores moderate location risk', async () => {
    const deps = makeDeps({ frequencyCount: 1, locationEntry: null });
    const result = await calculateRiskScore({
      transaction: { ...baseTransaction, location: 'Somewhere New' },
      customer: baseCustomer, // knownLocations does not include 'Somewhere New'
      account: oldAccount,
      ruleConfigByType,
      deps,
    });
    expect(result.breakdown.locationRisk).toBe(10);
  });

  test('a configured high-risk location uses its configured score, not a hard-coded value', async () => {
    const deps = makeDeps({ frequencyCount: 1, locationEntry: { riskScore: 18 } });
    const result = await calculateRiskScore({
      transaction: baseTransaction,
      customer: baseCustomer,
      account: oldAccount,
      ruleConfigByType,
      deps,
    });
    expect(result.breakdown.locationRisk).toBe(18);
  });

  test('risk score and level are deterministic - same inputs always produce the same output', async () => {
    const deps1 = makeDeps({ frequencyCount: 3, locationEntry: { riskScore: 5 }, confirmedSuspiciousCount: 1 });
    const deps2 = makeDeps({ frequencyCount: 3, locationEntry: { riskScore: 5 }, confirmedSuspiciousCount: 1 });
    const args = { transaction: baseTransaction, customer: baseCustomer, account: oldAccount, ruleConfigByType };
    const r1 = await calculateRiskScore({ ...args, deps: deps1 });
    const r2 = await calculateRiskScore({ ...args, deps: deps2 });
    expect(r1.totalScore).toBe(r2.totalScore);
    expect(r1.riskLevel).toBe(r2.riskLevel);
  });
});

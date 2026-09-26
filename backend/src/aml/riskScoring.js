const { RISK_LEVEL } = require('../utils/constants');

/**
 * Deterministic risk scoring engine.
 *
 * Total Risk Score = Amount Risk (0-30) + Frequency Risk (0-30) + Location Risk (0-20)
 *                     + Customer Risk (0-20)
 * Each component is independently capped so the sum can never exceed 100, and never falls
 * below 0. Nothing here is random - every point is derived from persisted transaction,
 * account, customer and configuration data.
 *
 * ---- Amount Risk (0-30) ----
 * Scaled linearly against the configured LARGE_TRANSACTION threshold:
 *   amountRisk = min(30, round((amount / threshold) * 30))
 * A transaction at the threshold scores the full 30; smaller transactions scale down linearly.
 *
 * ---- Frequency Risk (0-30) ----
 * Reuses the same rolling-window transaction count used by the HIGH_FREQUENCY rule:
 *   frequencyRisk = min(30, round((recentCount / minTransactionCount) * 30))
 * A customer who has just reached the frequency-rule trigger count scores the full 30.
 *
 * ---- Location Risk (0-20) ----
 * Looks up the transaction's location in the configurable LocationRisk table:
 *   - explicit entry found              -> that entry's riskScore (0-20, admin-configured)
 *   - not found, but known to customer  -> 2  (familiar, low risk)
 *   - not found and unfamiliar          -> 10 (new/unknown location, moderate risk)
 *
 * ---- Customer Risk (0-20) ----
 * Combines the customer's configured risk level, their history of confirmed-suspicious AML
 * alerts, and account age:
 *   base            LOW=0, MEDIUM=6, HIGH=12, CRITICAL=18
 *   + prior alerts  min(9, confirmedSuspiciousAlertCount * 3)
 *   + new account   +2 if the account is less than 30 days old
 *   customerRisk = min(20, base + priorAlerts + newAccountBonus)
 */

const RISK_LEVEL_BASE = { LOW: 0, MEDIUM: 6, HIGH: 12, CRITICAL: 18 };
const NEW_ACCOUNT_DAYS = 30;
const NEW_ACCOUNT_BONUS = 2;
const LOCATION_RISK_UNKNOWN_UNFAMILIAR = 10;
const LOCATION_RISK_UNKNOWN_FAMILIAR = 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function classifyRiskLevel(score) {
  if (score <= 30) return RISK_LEVEL.LOW;
  if (score <= 60) return RISK_LEVEL.MEDIUM;
  if (score <= 80) return RISK_LEVEL.HIGH;
  return RISK_LEVEL.CRITICAL;
}

function computeAmountRisk(amount, largeTxnRule) {
  const threshold = largeTxnRule?.threshold ?? 1000000;
  if (!threshold || threshold <= 0) return 0;
  return clamp(Math.round((amount / threshold) * 30), 0, 30);
}

async function computeFrequencyRisk(transaction, freqRule, deps) {
  const windowMinutes = freqRule?.timeWindowMinutes ?? 10;
  const minCount = freqRule?.minTransactionCount ?? 6;
  const windowStart = new Date(transaction.timestamp.getTime() - windowMinutes * 60 * 1000);
  const count = await deps.Transaction.countDocuments({
    customer: transaction.customer,
    timestamp: { $gt: windowStart, $lte: transaction.timestamp },
    status: { $ne: 'FAILED' },
  });
  if (!minCount || minCount <= 0) return 0;
  return clamp(Math.round((count / minCount) * 30), 0, 30);
}

async function computeLocationRisk(transaction, customer, deps) {
  const entry = await deps.LocationRisk.findOne({ location: transaction.location }).lean();
  if (entry) {
    return clamp(entry.riskScore, 0, 20);
  }
  const isKnown = (customer?.knownLocations || []).includes(transaction.location);
  return isKnown ? LOCATION_RISK_UNKNOWN_FAMILIAR : LOCATION_RISK_UNKNOWN_UNFAMILIAR;
}

async function computeCustomerRisk(customer, account, deps) {
  const base = RISK_LEVEL_BASE[customer?.customerRiskLevel] ?? 0;

  const confirmedSuspiciousCount = await deps.AmlAlert.countDocuments({
    customer: customer._id,
    status: 'CONFIRMED_SUSPICIOUS',
  });
  const priorAlertsRisk = clamp(confirmedSuspiciousCount * 3, 0, 9);

  const accountAgeMs = Date.now() - new Date(account.createdAt).getTime();
  const accountAgeDays = accountAgeMs / (1000 * 60 * 60 * 24);
  const newAccountBonus = accountAgeDays < NEW_ACCOUNT_DAYS ? NEW_ACCOUNT_BONUS : 0;

  return clamp(base + priorAlertsRisk + newAccountBonus, 0, 20);
}

/**
 * @param {Object} params
 * @param {Object} params.transaction - unsaved or saved Transaction doc/plain object (amount, location, timestamp, customer)
 * @param {Object} params.customer - Customer doc
 * @param {Object} params.account - Account doc
 * @param {Object} params.ruleConfigByType - { LARGE_TRANSACTION: AmlRule, HIGH_FREQUENCY: AmlRule, STRUCTURING: AmlRule }
 * @param {Object} params.deps - { Transaction, LocationRisk, AmlAlert } models (injectable for tests)
 */
async function calculateRiskScore({ transaction, customer, account, ruleConfigByType, deps }) {
  const amountRisk = computeAmountRisk(transaction.amount, ruleConfigByType.LARGE_TRANSACTION);
  const frequencyRisk = await computeFrequencyRisk(transaction, ruleConfigByType.HIGH_FREQUENCY, deps);
  const locationRisk = await computeLocationRisk(transaction, customer, deps);
  const customerRisk = await computeCustomerRisk(customer, account, deps);

  const totalScore = clamp(amountRisk + frequencyRisk + locationRisk + customerRisk, 0, 100);
  const riskLevel = classifyRiskLevel(totalScore);

  return {
    breakdown: { amountRisk, frequencyRisk, locationRisk, customerRisk },
    totalScore,
    riskLevel,
  };
}

module.exports = {
  calculateRiskScore,
  classifyRiskLevel,
  computeAmountRisk,
  computeFrequencyRisk,
  computeLocationRisk,
  computeCustomerRisk,
};

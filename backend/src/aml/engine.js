const ruleModules = require('./rules');
const { calculateRiskScore } = require('./riskScoring');
const { AmlRule, AmlAlert, Transaction, LocationRisk } = require('../models');
const logger = require('../config/logger');

const SEVERITY_RANK = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

function higherSeverity(a, b) {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

/**
 * Loads every configured AML rule (enabled or not) keyed by ruleType, so risk-scoring
 * formulas can reuse threshold/window configuration even for a currently-disabled rule,
 * while the alerting step below only evaluates rules that are enabled.
 */
async function loadRuleConfig() {
  const rules = await AmlRule.find({}).lean();
  const byType = {};
  const byCode = {};
  rules.forEach((r) => {
    byType[r.ruleType] = r; // last one wins if duplicate types exist; ruleCode is the real unique key
    byCode[r.ruleCode] = r;
  });
  return { rules, byType, byCode };
}

/**
 * Runs the full AML evaluation pipeline for a just-persisted transaction:
 *   1. Evaluate every ENABLED rule against the transaction (no thresholds hard-coded here -
 *      each rule reads its configuration from the database-backed AmlRule document).
 *   2. Calculate the deterministic 0-100 risk score from four weighted components.
 *   3. If any rule triggered, correlate all triggered rules into a SINGLE AmlAlert (never one
 *      alert per rule) and mark the transaction as suspicious.
 *
 * @returns {Promise<{riskScore:number, riskLevel:string, breakdown:object, triggeredRules:Array, alert:Object|null}>}
 */
async function evaluateTransaction(transaction, { customer, account }) {
  const deps = { Transaction, LocationRisk, AmlAlert };
  const { byType, byCode } = await loadRuleConfig();

  // --- Step 1: rule evaluation (only enabled rules can trigger an alert) ---
  const triggeredRules = [];
  const relevantRuleDocs = Object.values(byCode).filter((r) => r.enabled && ruleModules[r.ruleType]);

  for (const ruleDoc of relevantRuleDocs) {
    const module = ruleModules[ruleDoc.ruleType];
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await module.evaluate({ transaction, rule: ruleDoc, deps });
      if (result.triggered) {
        triggeredRules.push({
          ruleCode: ruleDoc.ruleCode,
          ruleName: ruleDoc.ruleName,
          reason: result.reason,
          severity: ruleDoc.severity,
        });
      }
    } catch (err) {
      logger.error('AML rule evaluation failed', { ruleCode: ruleDoc.ruleCode, message: err.message });
    }
  }

  // --- Step 2: risk scoring (independent of which rules are enabled, uses stored config) ---
  const { breakdown, totalScore, riskLevel } = await calculateRiskScore({
    transaction,
    customer,
    account,
    ruleConfigByType: byType,
    deps,
  });

  // --- Step 3: correlate into a single alert if warranted ---
  let alert = null;
  const isSuspicious = triggeredRules.length > 0;

  if (isSuspicious) {
    let severity = riskLevel; // baseline severity derived from the risk level
    triggeredRules.forEach((r) => {
      if (r.severity) severity = higherSeverity(severity, r.severity);
    });

    const reason = triggeredRules.map((r) => r.reason).join(' ');

    alert = await AmlAlert.create({
      transaction: transaction._id,
      customer: customer._id,
      account: account._id,
      triggeredRules: triggeredRules.map(({ ruleCode, ruleName, reason: r }) => ({
        ruleCode,
        ruleName,
        reason: r,
      })),
      riskScore: totalScore,
      riskLevel,
      severity,
      reason,
      status: 'OPEN',
    });
  }

  return {
    riskScore: totalScore,
    riskLevel,
    breakdown,
    triggeredRuleCodes: triggeredRules.map((r) => r.ruleCode),
    isSuspicious,
    alert,
  };
}

module.exports = { evaluateTransaction, loadRuleConfig };

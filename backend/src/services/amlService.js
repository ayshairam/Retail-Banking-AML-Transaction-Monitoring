const { AmlAlert, AmlRule } = require('../models');
const { ALERT_STATUS } = require('../utils/constants');
const ApiError = require('../utils/ApiError');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');
const auditService = require('./auditService');

async function listAlerts(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sortBy, query.sortDir, ['createdAt', 'riskScore', 'status']);

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.severity) filter.severity = query.severity;
  if (query.riskLevel) filter.riskLevel = query.riskLevel;
  if (query.customerId) filter.customer = query.customerId;

  const [items, total] = await Promise.all([
    AmlAlert.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate('customer', 'name email phone customerRiskLevel')
      .populate('account', 'accountNumber status')
      .populate('transaction')
      .populate('reviewer', 'name email'),
    AmlAlert.countDocuments(filter),
  ]);

  return { data: items, meta: buildMeta(page, limit, total) };
}

async function getAlertById(alertId) {
  const alert = await AmlAlert.findById(alertId)
    .populate('customer')
    .populate('account')
    .populate('transaction')
    .populate('reviewer', 'name email');
  if (!alert) throw ApiError.notFound('AML alert not found', 'ALERT_NOT_FOUND');
  return alert;
}

async function reviewAlert(alertId, { status, reviewNotes }, reviewer, req) {
  const alert = await AmlAlert.findById(alertId);
  if (!alert) throw ApiError.notFound('AML alert not found', 'ALERT_NOT_FOUND');

  const oldValue = { status: alert.status, reviewNotes: alert.reviewNotes };

  alert.status = status;
  alert.reviewNotes = reviewNotes;
  alert.reviewer = reviewer._id;
  alert.reviewedAt = new Date();
  await alert.save();

  await auditService.record({
    req,
    user: reviewer,
    action: 'ALERT_REVIEW',
    entityType: 'AmlAlert',
    entityId: alert._id,
    oldValue,
    newValue: { status: alert.status, reviewNotes: alert.reviewNotes },
  });

  return alert;
}

async function listRules() {
  return AmlRule.find({}).sort({ ruleCode: 1 });
}

async function updateRule(ruleId, updates, actingUser, req) {
  const rule = await AmlRule.findById(ruleId);
  if (!rule) throw ApiError.notFound('AML rule not found', 'RULE_NOT_FOUND');

  const oldValue = rule.toObject();
  Object.assign(rule, updates);
  await rule.save();

  await auditService.record({
    req,
    user: actingUser,
    action: 'AML_RULE_UPDATE',
    entityType: 'AmlRule',
    entityId: rule._id,
    oldValue,
    newValue: rule.toObject(),
  });

  return rule;
}

async function toggleRule(ruleId, enabled, actingUser, req) {
  const rule = await AmlRule.findById(ruleId);
  if (!rule) throw ApiError.notFound('AML rule not found', 'RULE_NOT_FOUND');

  const oldValue = { enabled: rule.enabled };
  rule.enabled = enabled;
  await rule.save();

  await auditService.record({
    req,
    user: actingUser,
    action: enabled ? 'AML_RULE_ENABLE' : 'AML_RULE_DISABLE',
    entityType: 'AmlRule',
    entityId: rule._id,
    oldValue,
    newValue: { enabled: rule.enabled },
  });

  return rule;
}

module.exports = { listAlerts, getAlertById, reviewAlert, listRules, updateRule, toggleRule, ALERT_STATUS };

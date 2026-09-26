const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const amlService = require('../services/amlService');

const listAlertsHandler = asyncHandler(async (req, res) => {
  const { data, meta } = await amlService.listAlerts(req.query);
  return success(res, 200, 'AML alerts retrieved', data, meta);
});

const getAlertHandler = asyncHandler(async (req, res) => {
  const alert = await amlService.getAlertById(req.params.id);
  return success(res, 200, 'AML alert retrieved', alert);
});

const reviewAlertHandler = asyncHandler(async (req, res) => {
  const alert = await amlService.reviewAlert(req.params.id, req.body, req.user, req);
  return success(res, 200, 'AML alert reviewed', alert);
});

const listRulesHandler = asyncHandler(async (req, res) => {
  const rules = await amlService.listRules();
  return success(res, 200, 'AML rules retrieved', rules);
});

const updateRuleHandler = asyncHandler(async (req, res) => {
  const rule = await amlService.updateRule(req.params.id, req.body, req.user, req);
  return success(res, 200, 'AML rule updated', rule);
});

const toggleRuleHandler = asyncHandler(async (req, res) => {
  const rule = await amlService.toggleRule(req.params.id, req.body.enabled, req.user, req);
  return success(res, 200, `AML rule ${req.body.enabled ? 'enabled' : 'disabled'}`, rule);
});

module.exports = {
  listAlertsHandler,
  getAlertHandler,
  reviewAlertHandler,
  listRulesHandler,
  updateRuleHandler,
  toggleRuleHandler,
};

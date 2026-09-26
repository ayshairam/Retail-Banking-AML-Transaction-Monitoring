const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const dashboardService = require('../services/dashboardService');
const ApiError = require('../utils/ApiError');
const { Customer, Account } = require('../models');

const complianceStatsHandler = asyncHandler(async (req, res) => {
  const stats = await dashboardService.getComplianceStats();
  return success(res, 200, 'Dashboard statistics retrieved', stats);
});

const customerDashboardHandler = asyncHandler(async (req, res) => {
  const customer = await Customer.findOne({ user: req.user._id });
  if (!customer) throw ApiError.notFound('Customer profile not found', 'CUSTOMER_NOT_FOUND');
  const account = await Account.findOne({ customer: customer._id });
  if (!account) throw ApiError.notFound('Account not found', 'ACCOUNT_NOT_FOUND');
  const data = await dashboardService.getCustomerDashboard(customer, account);
  return success(res, 200, 'Customer dashboard retrieved', data);
});

module.exports = { complianceStatsHandler, customerDashboardHandler };

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const transactionService = require('../services/transactionService');
const statementService = require('../services/statementService');
const accountService = require('../services/accountService');
const customerService = require('../services/customerService');
const ApiError = require('../utils/ApiError');

const createTransactionHandler = asyncHandler(async (req, res) => {
  const { transaction, alert, duplicate } = await transactionService.createTransaction(req.body, req.user, req);
  return success(
    res,
    201,
    duplicate ? 'Duplicate transaction request - returning original transaction' : 'Transaction completed successfully',
    { transaction, alertGenerated: !!alert, alert: alert || null }
  );
});

const getTransactionsForAccountHandler = asyncHandler(async (req, res) => {
  const { data, meta } = await transactionService.getTransactionsForAccount(
    req.params.accountId,
    req.query,
    req.user
  );
  return success(res, 200, 'Transactions retrieved', data, meta);
});

const searchTransactionsHandler = asyncHandler(async (req, res) => {
  const { data, meta } = await transactionService.searchTransactions(req.query);
  return success(res, 200, 'Transactions retrieved', data, meta);
});

const downloadStatementHandler = asyncHandler(async (req, res) => {
  const account = await accountService.getAccountById(req.params.accountId, req.user);
  const { customer } = await customerService.getCustomerById(account.customer._id, req.user);
  const { startDate, endDate, format } = req.query;
  if (!startDate || !endDate) {
    throw ApiError.badRequest('startDate and endDate query parameters are required', 'VALIDATION_ERROR');
  }
  const { buffer, contentType, extension } = await statementService.generateStatement(
    customer,
    account,
    startDate,
    endDate,
    format === 'csv' ? 'csv' : 'pdf'
  );
  res.setHeader('Content-Type', contentType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="statement-${account.accountNumber}.${extension}"`
  );
  return res.status(200).send(buffer);
});

module.exports = {
  createTransactionHandler,
  getTransactionsForAccountHandler,
  searchTransactionsHandler,
  downloadStatementHandler,
};

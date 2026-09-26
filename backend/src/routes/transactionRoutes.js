const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTransactionSchema,
  transactionSearchSchema,
} = require('../validators/transactionValidators');
const { ROLES } = require('../utils/constants');
const {
  createTransactionHandler,
  getTransactionsForAccountHandler,
  searchTransactionsHandler,
  downloadStatementHandler,
} = require('../controllers/transactionController');

const router = express.Router();

router.post(
  '/',
  authenticate,
  authorize(ROLES.CUSTOMER, ROLES.ADMIN),
  validate(createTransactionSchema),
  createTransactionHandler
);
router.get(
  '/search',
  authenticate,
  authorize(ROLES.EMPLOYEE, ROLES.ADMIN),
  validate(transactionSearchSchema, 'query'),
  searchTransactionsHandler
);
router.get('/statement/:accountId', authenticate, downloadStatementHandler);
router.get(
  '/:accountId',
  authenticate,
  validate(transactionSearchSchema, 'query'),
  getTransactionsForAccountHandler
);

module.exports = router;

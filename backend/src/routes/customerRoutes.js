const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { customerSearchSchema } = require('../validators/customerValidators');
const { ROLES } = require('../utils/constants');
const { getCustomerHandler, searchCustomersHandler } = require('../controllers/customerController');

const router = express.Router();

router.get(
  '/search',
  authenticate,
  authorize(ROLES.EMPLOYEE, ROLES.ADMIN),
  validate(customerSearchSchema, 'query'),
  searchCustomersHandler
);
router.get('/:id', authenticate, getCustomerHandler);

module.exports = router;

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { freezeSchema } = require('../validators/customerValidators');
const { ROLES } = require('../utils/constants');
const {
  getAccountHandler,
  freezeAccountHandler,
  unfreezeAccountHandler,
} = require('../controllers/accountController');

const router = express.Router();

router.get('/:id', authenticate, getAccountHandler);
router.put(
  '/:id/freeze',
  authenticate,
  authorize(ROLES.EMPLOYEE, ROLES.ADMIN),
  validate(freezeSchema),
  freezeAccountHandler
);
router.put(
  '/:id/unfreeze',
  authenticate,
  authorize(ROLES.EMPLOYEE, ROLES.ADMIN),
  validate(freezeSchema),
  unfreezeAccountHandler
);

module.exports = router;

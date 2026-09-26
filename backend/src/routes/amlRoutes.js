const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  alertSearchSchema,
  reviewAlertSchema,
  updateRuleSchema,
  toggleRuleSchema,
} = require('../validators/amlValidators');
const { ROLES } = require('../utils/constants');
const {
  listAlertsHandler,
  getAlertHandler,
  reviewAlertHandler,
  listRulesHandler,
  updateRuleHandler,
  toggleRuleHandler,
} = require('../controllers/amlController');

const router = express.Router();

// --- Alerts (employee/admin) ---
router.get(
  '/alerts',
  authenticate,
  authorize(ROLES.EMPLOYEE, ROLES.ADMIN),
  validate(alertSearchSchema, 'query'),
  listAlertsHandler
);
router.get('/alerts/:id', authenticate, authorize(ROLES.EMPLOYEE, ROLES.ADMIN), getAlertHandler);
router.put(
  '/alerts/:id/review',
  authenticate,
  authorize(ROLES.EMPLOYEE, ROLES.ADMIN),
  validate(reviewAlertSchema),
  reviewAlertHandler
);

// --- Rules (admin only for changes; employees may view) ---
router.get('/rules', authenticate, authorize(ROLES.EMPLOYEE, ROLES.ADMIN), listRulesHandler);
router.put(
  '/rules/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(updateRuleSchema),
  updateRuleHandler
);
router.put(
  '/rules/:id/toggle',
  authenticate,
  authorize(ROLES.ADMIN),
  validate(toggleRuleSchema),
  toggleRuleHandler
);

module.exports = router;

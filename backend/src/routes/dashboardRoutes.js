const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const { complianceStatsHandler, customerDashboardHandler } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', authenticate, authorize(ROLES.EMPLOYEE, ROLES.ADMIN), complianceStatsHandler);
router.get('/me', authenticate, authorize(ROLES.CUSTOMER), customerDashboardHandler);

module.exports = router;

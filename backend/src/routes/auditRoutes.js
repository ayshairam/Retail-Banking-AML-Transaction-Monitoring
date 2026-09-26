const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');
const { listAuditLogsHandler } = require('../controllers/auditController');

const router = express.Router();

router.get('/', authenticate, authorize(ROLES.ADMIN), listAuditLogsHandler);

module.exports = router;

const express = require('express');

const router = express.Router();

router.use('/auth', require('./authRoutes'));
router.use('/customers', require('./customerRoutes'));
router.use('/accounts', require('./accountRoutes'));
router.use('/transactions', require('./transactionRoutes'));
router.use('/aml', require('./amlRoutes'));
router.use('/dashboard', require('./dashboardRoutes'));
router.use('/audit-logs', require('./auditRoutes'));
router.use('/health', require('./healthRoutes'));

module.exports = router;

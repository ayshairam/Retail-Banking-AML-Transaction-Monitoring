const express = require('express');
const { healthHandler } = require('../controllers/healthController');

const router = express.Router();
router.get('/', healthHandler);

module.exports = router;

const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/apiResponse');
const auditLogService = require('../services/auditLogService');

const listAuditLogsHandler = asyncHandler(async (req, res) => {
  const { data, meta } = await auditLogService.listAuditLogs(req.query);
  return success(res, 200, 'Audit logs retrieved', data, meta);
});

module.exports = { listAuditLogsHandler };

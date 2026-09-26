const { AuditLog } = require('../models');
const { parsePagination, buildMeta, buildSort } = require('../utils/pagination');

async function listAuditLogs(query) {
  const { page, limit, skip } = parsePagination(query);
  const sort = buildSort(query.sortBy, query.sortDir, ['createdAt', 'action'], 'createdAt');

  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.userEmail) filter.userEmail = new RegExp(query.userEmail, 'i');

  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);

  return { data: items, meta: buildMeta(page, limit, total) };
}

module.exports = { listAuditLogs };

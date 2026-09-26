const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function buildMeta(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

/**
 * Whitelists a requested sort field/direction against an allowed set of fields, so callers
 * can never construct an arbitrary/unsafe Mongo sort object from user input.
 */
function buildSort(sortBy, sortDir, allowedFields, defaultField = 'createdAt') {
  const field = allowedFields.includes(sortBy) ? sortBy : defaultField;
  const direction = sortDir === 'asc' ? 1 : -1;
  return { [field]: direction };
}

module.exports = { parsePagination, buildMeta, buildSort, DEFAULT_LIMIT, MAX_LIMIT };

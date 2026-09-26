function success(res, statusCode, message, data = null, meta = undefined) {
  const body = { success: true, message, errorCode: null, data };
  if (meta) body.meta = meta;
  return res.status(statusCode).json(body);
}

function failure(res, statusCode, message, errorCode = 'ERROR', details = null) {
  const body = { success: false, message, errorCode, data: null };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}

module.exports = { success, failure };

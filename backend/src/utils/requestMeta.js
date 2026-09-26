// Extracts client IP/user-agent consistently for audit logging.
function getRequestMeta(req) {
  const ipAddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  return { ipAddress, userAgent };
}

module.exports = { getRequestMeta };

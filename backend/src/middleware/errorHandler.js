const logger = require('../utils/logger');
const AuditLogger = require('../utils/auditLogger');

/**
 * Global error handler middleware
 */
const errorHandler = async (err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Log to audit trail
  await AuditLogger.logAPIError(req.path, err, req.user?.id);

  // Don't leak error details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An error occurred processing your request'
      : err.message;

  return res.status(err.status || 500).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
};

module.exports = errorHandler;

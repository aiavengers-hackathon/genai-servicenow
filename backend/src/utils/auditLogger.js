const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class AuditLogger {
  /**
   * Log incident creation
   */
  static async logIncidentCreation(userId, incidentData, result) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'INCIDENT_CREATED',
      userId,
      incidentNumber: result.number,
      incidentId: result.sys_id,
      priority: result.priority,
      application: incidentData.application,
      description: incidentData.short_description?.substring(0, 100),
      status: 'SUCCESS',
    };

    await this._writeAuditLog(auditEntry);
    logger.info('Incident created successfully', auditEntry);
  }

  /**
   * Log incident creation failure
   */
  static async logIncidentCreationFailure(userId, incidentData, error) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'INCIDENT_CREATION_FAILED',
      userId,
      description: incidentData.short_description?.substring(0, 100),
      error: error.message,
      status: 'FAILED',
    };

    await this._writeAuditLog(auditEntry);
    logger.error('Incident creation failed', auditEntry);
  }

  /**
   * Log request creation
   */
  static async logRequestCreation(userId, requestData, result) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'REQUEST_CREATED',
      userId,
      requestNumber: result.number,
      requestId: result.sys_id,
      application: requestData.application,
      status: 'SUCCESS',
    };

    await this._writeAuditLog(auditEntry);
    logger.info('Request created successfully', auditEntry);
  }

  /**
   * Log KB article access
   */
  static async logKBArticleAccess(userId, articleId, articleTitle) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'KB_ARTICLE_ACCESSED',
      userId,
      articleId,
      articleTitle,
      status: 'SUCCESS',
    };

    await this._writeAuditLog(auditEntry);
  }

  /**
   * Log API error
   */
  static async logAPIError(endpoint, error, userId) {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'API_ERROR',
      endpoint,
      error: error.message,
      userId: userId || 'UNKNOWN',
      status: 'ERROR',
    };

    await this._writeAuditLog(auditEntry);
    logger.error('API error logged', auditEntry);
  }

  /**
   * Write audit log entry
   */
  static async _writeAuditLog(entry) {
    try {
      const logDir = process.env.AUDIT_LOG_DIR || './logs/audit';
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      const filename = path.join(
        logDir,
        `audit-${new Date().toISOString().split('T')[0]}.jsonl`
      );
      fs.appendFileSync(filename, JSON.stringify(entry) + '\n');
    } catch (error) {
      logger.error('Failed to write audit log', { error: error.message });
    }
  }
}

module.exports = AuditLogger;

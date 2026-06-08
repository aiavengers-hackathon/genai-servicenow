const logger = require('./logger');

class PIIProtection {
  /**
   * Detect PII in text
   */
  static detectPII(text) {
    if (!text || typeof text !== 'string') return null;

    const patterns = {
      email: /[\w\.-]+@[\w\.-]+\.\w+/g,
      phone: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
      creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    };

    const found = {};
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.match(pattern);
      if (matches) {
        found[type] = matches.length;
      }
    }

    return Object.keys(found).length > 0 ? found : null;
  }

  /**
   * Mask PII in text
   */
  static maskPII(text) {
    if (!text || typeof text !== 'string') return text;

    let masked = text;
    masked = masked.replace(/[\w\.-]+@[\w\.-]+\.\w+/g, '[EMAIL_MASKED]');
    masked = masked.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE_MASKED]');
    masked = masked.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_MASKED]');
    masked = masked.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD_MASKED]');
    masked = masked.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_MASKED]');

    return masked;
  }

  /**
   * Safe logging with PII protection
   */
  static safeLog(message, data = {}) {
    const safeData = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        const pii = this.detectPII(value);
        if (pii) {
          safeData[key] = this.maskPII(value);
          logger.warn(`PII detected in ${key}:`, pii);
        } else {
          safeData[key] = value;
        }
      } else {
        safeData[key] = value;
      }
    }
    logger.info(message, safeData);
  }
}

module.exports = PIIProtection;

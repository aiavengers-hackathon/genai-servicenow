const sanitizeHtml = require('sanitize-html');
const validator = require('validator');
const logger = require('./logger');

class ValidationService {
  /**
   * Validate and sanitize incident data
   */
  static validateIncidentData(data) {
    const errors = [];

    if (!data.short_description || data.short_description.trim().length < 5) {
      errors.push('Short description must be at least 5 characters');
    }

    if (!data.description || data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }

    if (!data.assignment_group || data.assignment_group.trim().length === 0) {
      errors.push('Assignment group is required');
    }

    if (!data.priority || ![1, 2, 3, 4, 5].includes(parseInt(data.priority))) {
      errors.push('Priority must be 1-5');
    }

    if (data.urgency && ![1, 2, 3, 4, 5].includes(parseInt(data.urgency))) {
      errors.push('Urgency must be 1-5');
    }

    if (data.impact && ![1, 2, 3, 4, 5].includes(parseInt(data.impact))) {
      errors.push('Impact must be 1-5');
    }

    if (errors.length === 0) {
      return {
        valid: true,
        data: {
          ...data,
          short_description: sanitizeHtml(data.short_description, { allowedTags: [] }),
          description: sanitizeHtml(data.description, { allowedTags: [] }),
          comments: data.comments ? sanitizeHtml(data.comments, { allowedTags: [] }) : '',
        },
      };
    }

    logger.warn('Incident validation failed', { errors });
    return { valid: false, errors };
  }

  /**
   * Validate service request data
   */
  static validateRequestData(data) {
    const errors = [];

    if (!data.requested_for || !validator.isLength(data.requested_for, { min: 3 })) {
      errors.push('Requested for (username) is required');
    }

    if (!data.short_description || data.short_description.trim().length < 5) {
      errors.push('Short description is required');
    }

    if (!data.catalog_item_sys_id) {
      errors.push('Catalog item selection is required');
    }

    return errors.length === 0
      ? { valid: true, data }
      : { valid: false, errors };
  }

  /**
   * Validate username format
   */
  static validateUsername(username) {
    const usernameRegex = /^[a-zA-Z0-9._-]{3,30}$/;
    return usernameRegex.test(username);
  }

  /**
   * Sanitize search queries
   */
  static sanitizeSearchQuery(query) {
    return query.trim().replace(/[<>'"]/g, '').substring(0, 500);
  }

  /**
   * Validate email
   */
  static validateEmail(email) {
    return validator.isEmail(email);
  }

  /**
   * Validate message length
   */
  static validateMessage(message) {
    if (!message || message.trim().length < 2) {
      return {
        valid: false,
        error: 'Message must be at least 2 characters'
      };
    }
    return { valid: true };
  }
}

module.exports = ValidationService;

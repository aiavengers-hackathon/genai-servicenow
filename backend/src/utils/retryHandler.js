const logger = require('./logger');

class RetryHandler {
  /**
   * Execute function with exponential backoff retry logic
   */
  static async executeWithRetry(
    fn,
    options = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
    }
  ) {
    let lastError;
    let delay = options.initialDelay;

    for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        const status = error.response?.status;
        if (status && status >= 400 && status < 500) {
          if (![429, 503, 504].includes(status)) {
            throw error;
          }
        }

        if (attempt < options.maxRetries) {
          logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, {
            error: error.message,
            endpoint: error.config?.url,
          });
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.min(delay * options.backoffMultiplier, options.maxDelay);
        }
      }
    }

    logger.error('All retry attempts failed', {
      error: lastError.message,
      totalAttempts: options.maxRetries,
    });
    throw lastError;
  }
}

module.exports = RetryHandler;

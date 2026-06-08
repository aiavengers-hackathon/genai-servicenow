const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const limiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_WINDOW || 15) * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || 100),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
    });
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
    });
  },
});

module.exports = limiter;

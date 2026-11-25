const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('../config/env');

/**
 * Global API rate limiter middleware
 */
const globalRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: 'draft-8', // Send draft-8 RateLimit headers (RateLimit-Policy, RateLimit-Limit, etc.)
  legacyHeaders: false,      // Disable X-RateLimit-* headers
  validate: { xForwardedForHeader: false },
  message: {
    success: false,
    status: 429,
    message: 'Too many requests from this IP address. Please try again later.',
  },
});

/**
 * Rate limiter for requesting password reset OTP (max 5 requests per 15 minutes)
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '127.0.0.1',
  message: {
    success: false,
    status: 429,
    message: 'Too many password reset requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Rate limiter for verifying OTP (max 10 attempts per 15 minutes)
 */
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false, xForwardedForHeader: false },
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress || '127.0.0.1',
  message: {
    success: false,
    status: 429,
    message: 'Too many verification attempts from this IP address. Please try again after 15 minutes.',
  },
});

module.exports = {
  globalRateLimiter,
  forgotPasswordLimiter,
  verifyOtpLimiter,
};

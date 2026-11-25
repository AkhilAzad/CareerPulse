const crypto = require('crypto');
const config = require('../config/env');

/**
 * Generate a cryptographically secure 6-digit numeric OTP
 * @returns {string} 6-digit string (e.g. '481923')
 */
const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Compute HMAC-SHA256 hash of a 6-digit OTP using the server secret
 * @param {string} otp 
 * @returns {string} Hex encoded hash
 */
const hashOtp = (otp) => {
  if (!otp || typeof otp !== 'string') return '';
  return crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(otp.trim())
    .digest('hex');
};

/**
 * Generate a cryptographically secure random 32-byte reset token
 * @returns {string} Hex string (64 characters)
 */
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Compute HMAC-SHA256 hash of the password reset token
 * @param {string} token 
 * @returns {string} Hex encoded hash
 */
const hashResetToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  return crypto
    .createHmac('sha256', config.JWT_SECRET)
    .update(token.trim())
    .digest('hex');
};

module.exports = {
  generateOtp,
  hashOtp,
  generateResetToken,
  hashResetToken,
};

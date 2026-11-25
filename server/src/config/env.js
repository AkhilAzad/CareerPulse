const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Prioritize server/.env, fallback to workspace root .env if present
const serverEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
}
if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const rawJwtSecret = process.env.JWT_SECRET || '';

// Fail safely if JWT_SECRET is missing or insecure in production
if (NODE_ENV === 'production') {
  if (!rawJwtSecret || rawJwtSecret.trim().length < 32) {
    throw new Error('FATAL CONFIGURATION ERROR: In production, JWT_SECRET must be set and at least 32 characters long.');
  }
} else if (!rawJwtSecret) {
  console.warn('[Security Warning] JWT_SECRET is not configured. Using temporary development fallback secret. Please configure JWT_SECRET in server/.env.');
}

const rawSmtpHost = (process.env.SMTP_HOST || '').trim();
const rawSmtpPort = parseInt(process.env.SMTP_PORT, 10);
const rawSmtpSecure = (process.env.SMTP_SECURE || '').trim().toLowerCase();
const rawSmtpUser = (process.env.SMTP_USER || '').trim();
const rawSmtpPass = (process.env.SMTP_PASS || '').trim();
const rawSmtpFrom = (process.env.SMTP_FROM || '').trim();

const isGmailHost = rawSmtpHost.toLowerCase().includes('gmail');

const config = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  MONGODB_URI: process.env.MONGODB_URI || process.env.MONGO_URI || '',
  JWT_SECRET: rawJwtSecret || 'dev_fallback_careerpulse_ats_jwt_secret_insecure_key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX, 10) || 200,
  SMTP_HOST: rawSmtpHost || (rawSmtpUser && rawSmtpUser.endsWith('@gmail.com') ? 'smtp.gmail.com' : ''),
  SMTP_PORT: Number.isInteger(rawSmtpPort) ? rawSmtpPort : (isGmailHost ? 465 : 587),
  SMTP_SECURE: rawSmtpSecure === 'true' || rawSmtpPort === 465 || (isGmailHost && rawSmtpPort !== 587),
  SMTP_USER: rawSmtpUser,
  SMTP_PASS: rawSmtpPass,
  SMTP_FROM: rawSmtpFrom,
};

module.exports = config;

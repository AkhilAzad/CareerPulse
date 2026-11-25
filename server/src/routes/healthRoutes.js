const express = require('express');
const { getDatabaseStatus } = require('../config/database');
const { getSmtpStatus } = require('../utils/mailer');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    Health check endpoint returning API operational status and database connection status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStatus = getDatabaseStatus();
  const smtpStatus = getSmtpStatus();

  const response = {
    status: dbStatus.isConnected ? 'ok' : 'degraded',
    service: 'CareerPulse ATS API',
    message: dbStatus.isConnected
      ? 'CareerPulse ATS backend service is fully operational and connected to MongoDB'
      : 'CareerPulse ATS backend service is operational (database not connected)',
    database: dbStatus.status,
    emailService: {
      configured: smtpStatus.isConfigured,
      host: smtpStatus.host || null,
      port: smtpStatus.port,
      secure: smtpStatus.secure,
      hasUser: smtpStatus.hasUser,
      hasPass: smtpStatus.hasPass,
      missing: smtpStatus.missing,
    },
    timestamp: new Date().toISOString(),
    uptime: `${process.uptime().toFixed(2)}s`,
    environment: process.env.NODE_ENV || 'development',
  };

  // Only include database host if confirmed connected
  if (dbStatus.isConnected && dbStatus.host) {
    response.databaseHost = dbStatus.host;
    response.databaseName = dbStatus.name;
  } else {
    if (dbStatus.error) {
      response.databaseError = dbStatus.error;
    }
    if (dbStatus.reconnectAttempts) {
      response.databaseReconnectAttempts = dbStatus.reconnectAttempts;
    }
  }

  res.status(200).json(response);
});

module.exports = router;

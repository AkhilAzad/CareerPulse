const app = require('./src/app');
const { PORT, NODE_ENV, FRONTEND_URL } = require('./src/config/env');
const { connectDB, disconnectDB, getDatabaseStatus } = require('./src/config/database');
const { getSmtpStatus } = require('./src/utils/mailer');


let server;
const startServer = async () => {
  try {
    console.log('[CareerPulse ATS Server] Connecting to MongoDB Atlas...');
    await connectDB();

    const dbStatus = getDatabaseStatus();
    
    
    
    server = app.listen(PORT, () => {
      console.log('====================================================');
      if (dbStatus.isConnected) {
        console.log('[CareerPulse ATS Server] Backend is fully ready');
        console.log(`- Database:     Connected (${dbStatus.host})`);
      } else {
        console.log('[CareerPulse ATS Server] Backend started (Database currently offline)');
        console.log(`- Database:     ${dbStatus.status.toUpperCase()} (Background auto-reconnection active)`);
        if (dbStatus.error) {
          console.log(`- DB Status:    ${dbStatus.error}`);
        }
      }
      
      console.log(`- Port:         ${PORT}`);
      console.log(`- Environment:  ${NODE_ENV}`);
      console.log(`- Frontend URL: ${FRONTEND_URL}`);
      console.log(`- Health Check: http://localhost:${PORT}/api/health`);
      console.log('----------------------------------------------------');
      
      // Safe SMTP Diagnostic (never exposes secrets or passwords)
      const smtpStatus = getSmtpStatus();
      console.log(`[SMTP Mailer Service] Status: ${smtpStatus.isConfigured ? 'READY (Configured)' : 'INCOMPLETE (Not Configured)'}`);
      console.log(`- Host:         ${smtpStatus.host ? `[PRESENT] (${smtpStatus.host})` : '[MISSING]'}`);
      console.log(`- Port:         ${smtpStatus.port}`);
      console.log(`- Secure (TLS): ${smtpStatus.secure}`);
      console.log(`- SMTP_USER:    ${smtpStatus.hasUser ? '[PRESENT]' : '[MISSING]'}`);
      console.log(`- SMTP_PASS:    ${smtpStatus.hasPass ? '[PRESENT]' : '[MISSING]'}`);
      console.log(`- SMTP_FROM:    ${smtpStatus.hasFrom ? '[CUSTOM SET]' : (smtpStatus.hasUser ? '[AUTO: FROM USER]' : '[DEFAULT]')}`);
      if (!smtpStatus.isConfigured) {
        console.log(`! Action Required: Define ${smtpStatus.missing.join(' and ')} in server/.env to enable OTP email dispatch.`);
      }
      console.log('====================================================');
    });

    return server;
  } catch (error) {
    console.error(`[CareerPulse ATS Server] Startup failed: ${error.message}`);
    process.exit(1);
  }
};

// Graceful termination handling
const shutdown = async () => {
  console.log('[CareerPulse ATS Server] Received shutdown signal. Closing server...');
  if (server) {
    server.close(async () => {
      await disconnectDB();
      console.log('[CareerPulse ATS Server] Server terminated cleanly.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle unhandled Promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`[Unhandled Rejection] ${err.name}: ${err.message}`);
  if (err.stack) console.error(err.stack);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error(`[Uncaught Exception] ${err.name}: ${err.message}`);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});

// Start the server
startServer();

module.exports = {
  app,
  startServer,
  get server() {
    return server;
  },
};

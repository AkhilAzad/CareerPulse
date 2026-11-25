const path = require('path');
process.env.NODE_PATH = path.resolve(__dirname, '../node_modules');
require('module').Module._initPaths();

const mongoose = require('mongoose');
const {
  connectDB,
  disconnectDB,
  getDatabaseStatus,
  maskCredentials,
} = require('../src/config/database');

const runDatabaseTests = async () => {
  console.log('========================================================');
  console.log('[CareerPulse ATS] Running Database Resilience & Diagnostics Tests');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✓ PASS: ${title}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${title}`);
      failed++;
    }
  };

  // --------------------------------------------------------------------------
  // Test Suite 1: Credential Sanitization
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Credential Sanitization (maskCredentials)');

  const rawStandardUri = 'mongodb://app_user:SuperSecretPassword123!@mongo.internal:27017/careerpulse';
  const maskedStandard = maskCredentials(rawStandardUri);
  assert(!maskedStandard.includes('SuperSecretPassword123!'), 'Strips password from standard MongoDB URI');
  assert(maskedStandard.includes('***:***@'), 'Replaces user:pass with ***:***@ placeholder');

  const rawSrvUri = 'mongodb+srv://admin_john:P%40ssw0rd99@cluster0.abcde.mongodb.net/careerpulse?retryWrites=true';
  const maskedSrv = maskCredentials(rawSrvUri);
  assert(!maskedSrv.includes('P%40ssw0rd99'), 'Strips password from MongoDB+SRV Atlas URI');
  assert(maskedSrv.startsWith('mongodb+srv://***:***@cluster0.abcde.mongodb.net'), 'Preserves cluster host while masking credentials');

  const rawError = 'MongoServerError: Authentication failed for user "dbuser" with password "SecretPass123" at mongodb://dbuser:SecretPass123@host:27017';
  const maskedError = maskCredentials(rawError);
  assert(!maskedError.includes('SecretPass123'), 'Strips credentials from runtime driver error messages');

  assert(maskCredentials('') === '', 'Handles empty string safely');
  assert(maskCredentials(null) === '', 'Handles null input safely');

  // --------------------------------------------------------------------------
  // Test Suite 2: Connection Diagnostics & ReadyState
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: Connection Diagnostics & ReadyState (getDatabaseStatus)');

  const statusDisconnected = getDatabaseStatus();
  assert(typeof statusDisconnected.status === 'string', 'Returns connection status string');
  assert(typeof statusDisconnected.isConnected === 'boolean', 'Returns isConnected boolean flag');
  assert(typeof statusDisconnected.readyState === 'number', 'Returns numeric readyState');

  // --------------------------------------------------------------------------
  // Test Suite 3: Connection Deduplication & In-Flight Reentrancy
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Safe Re-entrancy & Connection In-Flight Deduplication');

  // Save original connect method
  const originalConnect = mongoose.connect;
  let connectCallCount = 0;

  // Mock mongoose.connect with simulated async connection
  mongoose.connect = async () => {
    connectCallCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return mongoose;
  };

  // Call connectDB concurrently twice
  const p1 = connectDB();
  const p2 = connectDB();

  await Promise.all([p1, p2]);

  assert(connectCallCount === 1, 'Reuses active in-flight connection promise without racing duplicate attempts');

  // Restore mongoose.connect
  mongoose.connect = originalConnect;

  // --------------------------------------------------------------------------
  // Test Suite 4: Clean Shutdown
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Clean Shutdown (disconnectDB)');

  await disconnectDB();
  const postDisconnectStatus = getDatabaseStatus();
  assert(postDisconnectStatus.status === 'disconnected', 'Reports disconnected after disconnectDB');

  console.log('\n========================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runDatabaseTests().catch((err) => {
  console.error('[Database Test Failure]', err);
  process.exit(1);
});

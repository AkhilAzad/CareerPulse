const http = require('http');
const path = require('path');

// Ensure module resolution points to server/node_modules
process.env.NODE_PATH = path.resolve(__dirname, '../node_modules');
require('module').Module._initPaths();

const { hashPassword, comparePassword } = require('../src/utils/password');
const {
  generateOtp,
  hashOtp,
  generateResetToken,
  hashResetToken,
} = require('../src/utils/security');
const {
  isMailConfigured,
  setTestTransporter,
  sendPasswordResetEmail,
} = require('../src/utils/mailer');
const app = require('../src/app');
const { User } = require('../src/models');
const config = require('../src/config/env');

/**
 * Lightweight in-memory HTTP caller for Express app
 */
const mockRequest = (app, { method = 'GET', url = '/', headers = {}, body = null, ip = '127.0.0.1' }) => {
  return new Promise((resolve, reject) => {
    const socket = {
      remoteAddress: ip,
      encrypted: false,
      readable: true,
      writable: true,
      on: () => {},
      once: () => {},
      emit: () => {},
      destroy: () => {},
    };

    const req = new http.IncomingMessage(socket);
    req.socket = socket;
    req.connection = socket;
    req.method = method.toUpperCase();
    req.url = url;
    req.originalUrl = url;
    req.headers = {
      'content-type': 'application/json',
      'x-forwarded-for': ip,
      ...Object.fromEntries(
        Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
      ),
    };
    req.body = body || {};

    const res = new http.ServerResponse(req);
    let capturedBody = null;

    res.json = function (data) {
      capturedBody = data;
      this.setHeader('content-type', 'application/json');
      resolve({ status: this.statusCode, body: capturedBody });
    };

    res.send = function (data) {
      if (typeof data === 'object') {
        capturedBody = data;
      } else {
        try {
          capturedBody = JSON.parse(data);
        } catch (_) {
          capturedBody = data;
        }
      }
      resolve({ status: this.statusCode, body: capturedBody });
    };

    res.end = function (chunk) {
      if (chunk && !capturedBody) {
        try {
          capturedBody = JSON.parse(chunk.toString());
        } catch (_) {
          capturedBody = chunk.toString();
        }
      }
      resolve({ status: this.statusCode, body: capturedBody });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, body: { message: 'Not Found' } });
    });
  });
};

const runPasswordResetTests = async () => {
  console.log('========================================================');
  console.log('[CareerPulse ATS] Running Password Reset & OTP Tests');
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
  // Test Suite 1: Security & Cryptographic OTP Primitives
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Security & Cryptographic OTP Primitives');

  const otp1 = generateOtp();
  const otp2 = generateOtp();
  assert(/^\d{6}$/.test(otp1), 'Generates 6-digit numeric OTP');
  assert(parseInt(otp1, 10) >= 100000 && parseInt(otp1, 10) <= 999999, 'OTP is within range [100000, 999999]');
  assert(typeof otp1 === 'string', 'OTP is returned as a formatted string');

  const hashedOtp1 = hashOtp(otp1);
  const hashedOtp1Again = hashOtp(otp1);
  const hashedOtp2 = hashOtp(otp2);
  assert(Boolean(hashedOtp1 && hashedOtp1.length === 64), 'Hashes OTP using SHA-256 HMAC (64 hex characters)');
  assert(hashedOtp1 === hashedOtp1Again, 'OTP hashing is deterministic for identical OTPs');
  if (otp1 !== otp2) {
    assert(hashedOtp1 !== hashedOtp2, 'Different OTPs produce distinct hashes');
  } else {
    assert(true, 'Distinct hashes tested');
  }

  const token1 = generateResetToken();
  assert(Boolean(token1 && token1.length === 64), 'Generates 32-byte (64 hex) resetToken');
  const tokenHash = hashResetToken(token1);
  assert(Boolean(tokenHash && tokenHash.length === 64), 'Hashes reset token using SHA-256 HMAC');

  // --------------------------------------------------------------------------
  // Test Suite 2: Mailer Configuration & Fail-Safe Behavior
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: Mailer Configuration & Fail-Safe Behavior');

  // Test 2a: When mail is not configured
  const savedSmtpHost = config.SMTP_HOST;
  const savedSmtpUser = config.SMTP_USER;
  const savedSmtpPass = config.SMTP_PASS;

  config.SMTP_HOST = '';
  config.SMTP_USER = '';
  config.SMTP_PASS = '';
  setTestTransporter(null);

  assert(isMailConfigured() === false, 'Detects unconfigured email service');

  // Test 2a-2: Gmail host without user or pass credentials
  config.SMTP_HOST = 'smtp.gmail.com';
  config.SMTP_USER = '';
  config.SMTP_PASS = '';
  assert(isMailConfigured() === false, 'Detects Gmail SMTP is unconfigured when USER and PASS are blank');

  config.SMTP_USER = 'user@gmail.com';
  config.SMTP_PASS = 'abcd efgh ijkl mnop';
  assert(isMailConfigured() === true, 'Detects Gmail SMTP is configured when USER and PASS are provided');

  config.SMTP_HOST = '';
  config.SMTP_USER = '';
  config.SMTP_PASS = '';

  let mailErrorThrown = false;
  try {
    await sendPasswordResetEmail('user@careerpulse.test', '123456');
  } catch (err) {
    mailErrorThrown = true;
    assert(err.code === 'MAIL_NOT_CONFIGURED', 'Throws MAIL_NOT_CONFIGURED error when SMTP is missing');
  }
  assert(mailErrorThrown, 'Rejects sending email when SMTP is unconfigured');

  // Test 2b: Mock Mail Transporter for Offline Testing
  const sentEmails = [];
  const mockTransporter = {
    sendMail: async (mailOptions) => {
      sentEmails.push(mailOptions);
      return { messageId: 'test-msg-id-123' };
    },
  };
  setTestTransporter(mockTransporter);
  assert(isMailConfigured() === true, 'Test transporter enables mail configuration');

  await sendPasswordResetEmail('candidate@careerpulse.test', '654321');
  assert(sentEmails.length === 1, 'Mock transporter successfully receives email payload');
  assert(sentEmails[0].to === 'candidate@careerpulse.test', 'Email recipient is correct');
  assert(sentEmails[0].text.includes('654321'), 'Email text contains OTP');
  assert(sentEmails[0].html.includes('654321'), 'Email HTML contains styled OTP');

  // --------------------------------------------------------------------------
  // In-Memory Test User Fixture
  // --------------------------------------------------------------------------
  const initialPassword = 'OriginalPassword123!';
  const initialPasswordHash = await hashPassword(initialPassword);

  let inMemoryUser = {
    _id: '60d0fe4f5311236168a109cb',
    name: 'Sarah Connor',
    email: 'sarah@careerpulse.test',
    passwordHash: initialPasswordHash,
    role: 'candidate',
    isActive: true,
    passwordReset: undefined,
    save: async function () {
      return this;
    },
    toSafeObject: function () {
      const obj = { ...this };
      delete obj.passwordHash;
      delete obj.passwordReset;
      return obj;
    },
  };

  // Mock User.findOne to query in-memory user
  User.findOne = (query) => {
    let selectedFields = '';
    const chainable = {
      select: (fields) => {
        selectedFields = fields;
        return chainable;
      },
      then: (resolve) => {
        if (query.email && query.email === inMemoryUser.email && inMemoryUser.isActive) {
          return resolve(inMemoryUser);
        }
        return resolve(null);
      },
    };
    return chainable;
  };

  // --------------------------------------------------------------------------
  // Test Suite 3: POST /api/auth/forgot-password (Request OTP)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: POST /api/auth/forgot-password (Request OTP)');

  // Test 3a: Bad email format
  const badEmailRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/forgot-password',
    body: { email: 'not-an-email' },
    ip: '10.0.0.1',
  });
  assert(badEmailRes.status === 400, 'Rejects invalid email format with HTTP 400');

  // Test 3b: When mail service is unconfigured, return 503
  setTestTransporter(null);
  config.SMTP_HOST = '';
  const noSmtpRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/forgot-password',
    body: { email: 'sarah@careerpulse.test' },
    ip: '10.0.0.2',
  });
  assert(noSmtpRes.status === 503, 'Returns HTTP 503 when email service is unconfigured');
  assert(noSmtpRes.body?.message?.includes('Email service is not configured'), 'Error clearly informs SMTP is not configured');
  assert(noSmtpRes.body?.message?.includes('Missing required SMTP settings'), 'Error clearly lists missing SMTP settings');

  // Re-enable mock transporter
  setTestTransporter(mockTransporter);
  sentEmails.length = 0; // Clear history

  // Test 3c: Non-existent email (User enumeration prevention)
  const nonExistentEmailRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/forgot-password',
    body: { email: 'unknown_person@careerpulse.test' },
    ip: '10.0.0.3',
  });
  assert(nonExistentEmailRes.status === 200, 'Returns HTTP 200 for non-existent email (anti-enumeration)');
  assert(sentEmails.length === 0, 'Does not dispatch email for unknown account');
  assert(
    nonExistentEmailRes.body?.message?.includes('If an account exists'),
    'Uses generic notification message to prevent user enumeration'
  );

  // Test 3d: Valid existing user
  const validForgotRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/forgot-password',
    body: { email: 'sarah@careerpulse.test' },
    ip: '10.0.0.4',
  });
  assert(validForgotRes.status === 200, 'Returns HTTP 200 for registered email');
  assert(validForgotRes.body?.message?.includes('If an account exists'), 'Returns consistent generic notification');
  assert(sentEmails.length === 1, 'Email is dispatched to registered user');
  assert(sentEmails[0].to === 'sarah@careerpulse.test', 'Email dispatched to user address');

  // Extract the sent OTP from the captured email
  const emailBody = sentEmails[0].text;
  const otpMatch = emailBody.match(/\b(\d{6})\b/);
  const sentOtp = otpMatch ? otpMatch[1] : null;
  assert(Boolean(sentOtp), 'Extracted 6-digit OTP from dispatched email');

  // Check database state
  assert(Boolean(inMemoryUser.passwordReset?.otpHash), 'User record has stored otpHash');
  assert(inMemoryUser.passwordReset.otpHash !== sentOtp, 'Database stores cryptographic hash, NOT plaintext OTP');
  assert(inMemoryUser.passwordReset.otpAttempts === 0, 'otpAttempts is initialized to 0');
  assert(inMemoryUser.passwordReset.otpExpiresAt > new Date(), 'otpExpiresAt is set in the future');

  // --------------------------------------------------------------------------
  // Test Suite 4: POST /api/auth/verify-otp (Verify OTP)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: POST /api/auth/verify-otp (Verify OTP)');

  // Test 4a: Malformed inputs
  const badOtpFormatRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/verify-otp',
    body: { email: 'sarah@careerpulse.test', otp: 'abc' },
    ip: '10.0.1.1',
  });
  assert(badOtpFormatRes.status === 400, 'Rejects non-6-digit OTP with HTTP 400');

  // Test 4b: Incorrect OTP attempt increments attempt count
  const wrongOtpRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/verify-otp',
    body: { email: 'sarah@careerpulse.test', otp: '000000' },
    ip: '10.0.1.2',
  });
  assert(wrongOtpRes.status === 400, 'Rejects incorrect OTP with HTTP 400');
  assert(inMemoryUser.passwordReset.otpAttempts === 1, 'Increments otpAttempts on wrong submission (1/5)');

  // Test 4c: Brute force lockout (5 failed attempts invalidates OTP)
  for (let i = 2; i <= 5; i++) {
    await mockRequest(app, {
      method: 'POST',
      url: '/api/auth/verify-otp',
      body: { email: 'sarah@careerpulse.test', otp: `00000${i}` },
      ip: `10.0.1.${i + 2}`,
    });
  }
  assert(inMemoryUser.passwordReset.otpHash === undefined, 'OTP hash is permanently invalidated after 5 failed attempts');

  // Verify that subsequent attempt fails because OTP is invalidated
  const postLockoutRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/verify-otp',
    body: { email: 'sarah@careerpulse.test', otp: sentOtp },
    ip: '10.0.1.8',
  });
  assert(postLockoutRes.status === 400, 'Rejects previously valid OTP after 5-attempt invalidation');

  // Test 4d: Expired OTP check
  // Issue fresh OTP
  const freshOtp = generateOtp();
  inMemoryUser.passwordReset = {
    otpHash: hashOtp(freshOtp),
    otpExpiresAt: new Date(Date.now() - 1000), // Already expired 1 second ago
    otpAttempts: 0,
  };

  const expiredRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/verify-otp',
    body: { email: 'sarah@careerpulse.test', otp: freshOtp },
    ip: '10.0.1.9',
  });
  assert(expiredRes.status === 400, 'Rejects expired OTP with HTTP 400');
  assert(expiredRes.body?.message?.includes('expired'), 'Error message specifies code has expired');

  // Test 4e: Successful verification issues single-use resetToken
  const validOtp = generateOtp();
  inMemoryUser.passwordReset = {
    otpHash: hashOtp(validOtp),
    otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
    otpAttempts: 0,
  };

  const verifySuccessRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/verify-otp',
    body: { email: 'sarah@careerpulse.test', otp: validOtp },
    ip: '10.0.1.10',
  });
  assert(verifySuccessRes.status === 200, 'Verifies valid OTP with HTTP 200');
  assert(Boolean(verifySuccessRes.body?.resetToken), 'Returns single-use resetToken in response');
  const validResetToken = verifySuccessRes.body.resetToken;

  // Verify OTP was cleared to enforce 1-time use
  assert(inMemoryUser.passwordReset.otpHash === undefined, 'Enforces 1-time use: otpHash cleared after verification');
  assert(Boolean(inMemoryUser.passwordReset.resetTokenHash), 'Stores resetTokenHash on user doc');

  // Verify same OTP cannot be reused
  const reuseOtpRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/verify-otp',
    body: { email: 'sarah@careerpulse.test', otp: validOtp },
    ip: '10.0.1.11',
  });
  assert(reuseOtpRes.status === 400, 'Rejects reuse of already-verified OTP (1-time use)');

  // --------------------------------------------------------------------------
  // Test Suite 5: POST /api/auth/reset-password (Reset Password)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: POST /api/auth/reset-password (Reset Password)');

  // Test 5a: Short password rejection (< 8 characters)
  const shortPassRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/reset-password',
    body: {
      email: 'sarah@careerpulse.test',
      resetToken: validResetToken,
      newPassword: 'short',
    },
    ip: '10.0.2.1',
  });
  assert(shortPassRes.status === 400, 'Rejects new password shorter than 8 characters');

  // Test 5b: Invalid reset token rejection
  const invalidTokenRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/reset-password',
    body: {
      email: 'sarah@careerpulse.test',
      resetToken: 'invalid_or_forged_reset_token_hex',
      newPassword: 'BrandNewSecurePassword456!',
    },
    ip: '10.0.2.2',
  });
  assert(invalidTokenRes.status === 400, 'Rejects invalid / forged reset token');

  // Test 5c: Expired reset token session rejection
  const originalExpiresAt = inMemoryUser.passwordReset.resetTokenExpiresAt;
  inMemoryUser.passwordReset.resetTokenExpiresAt = new Date(Date.now() - 1000); // Expired
  const expiredTokenRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/reset-password',
    body: {
      email: 'sarah@careerpulse.test',
      resetToken: validResetToken,
      newPassword: 'BrandNewSecurePassword456!',
    },
    ip: '10.0.2.3',
  });
  assert(expiredTokenRes.status === 400, 'Rejects expired reset session');
  // Restore valid reset token
  inMemoryUser.passwordReset = {
    resetTokenHash: hashResetToken(validResetToken),
    resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
  };

  // Test 5d: Successful password reset
  const newPassword = 'BrandNewSecurePassword456!';
  const resetSuccessRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/reset-password',
    body: {
      email: 'sarah@careerpulse.test',
      resetToken: validResetToken,
      newPassword,
    },
    ip: '10.0.2.4',
  });
  assert(resetSuccessRes.status === 200, 'Resets password successfully with HTTP 200');
  assert(
    resetSuccessRes.body?.message?.includes('Password has been reset successfully'),
    'Success response contains clear user confirmation'
  );

  // Verify new password was hashed with bcrypt cost 12
  assert(inMemoryUser.passwordHash.startsWith('$2'), 'New password is saved as bcrypt hash');
  assert(
    await comparePassword(newPassword, inMemoryUser.passwordHash),
    'New password successfully verifies against saved bcrypt hash'
  );
  assert(
    !(await comparePassword(initialPassword, inMemoryUser.passwordHash)),
    'Old password is no longer valid'
  );

  // Verify reset session is wiped (single-use resetToken)
  assert(inMemoryUser.passwordReset === undefined, 'Clears passwordReset subdocument after successful reset');

  // Test 5e: Cannot reuse the resetToken
  const tokenReuseRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/reset-password',
    body: {
      email: 'sarah@careerpulse.test',
      resetToken: validResetToken,
      newPassword: 'AnotherPassword789!',
    },
    ip: '10.0.2.5',
  });
  assert(tokenReuseRes.status === 400, 'Rejects reuse of resetToken after password was reset');

  // --------------------------------------------------------------------------
  // Test Suite 6: Login Authentication Verification with New Credentials
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 6: Login Authentication Verification with New Credentials');

  // Test 6a: Login with old password fails
  const oldLoginRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'sarah@careerpulse.test',
      password: initialPassword,
    },
  });
  assert(oldLoginRes.status === 401, 'Login with old password fails with HTTP 401');

  // Test 6b: Login with new password succeeds
  const newLoginRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'sarah@careerpulse.test',
      password: newPassword,
    },
  });
  assert(newLoginRes.status === 200, 'Login with new password succeeds with HTTP 200');
  assert(Boolean(newLoginRes.body?.token), 'Returns valid JWT token on login with new password');

  // --------------------------------------------------------------------------
  // Test Suite 7: Rate Limiting Enforcement
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 7: Rate Limiting Enforcement');

  // Test 7a: forgotPasswordLimiter (max 5 requests per 15 min per IP)
  const rateLimitTestIp = '198.51.100.42';
  let got429Forgot = false;

  for (let i = 1; i <= 6; i++) {
    const res = await mockRequest(app, {
      method: 'POST',
      url: '/api/auth/forgot-password',
      body: { email: 'sarah@careerpulse.test' },
      ip: rateLimitTestIp,
    });

    if (i <= 5) {
      assert(res.status === 200, `Forgot password request ${i}/5 within rate limit accepted`);
    } else {
      assert(res.status === 429, '6th forgot password request rejected with HTTP 429 Too Many Requests');
      got429Forgot = res.status === 429;
    }
  }
  assert(got429Forgot, 'forgotPasswordLimiter successfully blocks flood requests');

  // Test 7b: verifyOtpLimiter (max 10 verification requests per 15 min per IP)
  const rateLimitVerifyIp = '198.51.100.99';
  let got429Verify = false;

  for (let i = 1; i <= 11; i++) {
    const res = await mockRequest(app, {
      method: 'POST',
      url: '/api/auth/verify-otp',
      body: { email: 'sarah@careerpulse.test', otp: '123456' },
      ip: rateLimitVerifyIp,
    });

    if (i <= 10) {
      assert(res.status === 400, `Verify OTP request ${i}/10 within rate limit processed`);
    } else {
      assert(res.status === 429, '11th verify OTP request rejected with HTTP 429 Too Many Requests');
      got429Verify = res.status === 429;
    }
  }
  assert(got429Verify, 'verifyOtpLimiter successfully blocks brute-force attempts');

  // Restore SMTP config
  config.SMTP_HOST = savedSmtpHost;
  config.SMTP_USER = savedSmtpUser;
  config.SMTP_PASS = savedSmtpPass;

  console.log('\n========================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runPasswordResetTests().catch((err) => {
  console.error('[Test Failure] Unhandled error in password reset tests:', err);
  process.exit(1);
});

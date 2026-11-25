const http = require('http');
const path = require('path');

// Ensure module resolution points to server/node_modules
process.env.NODE_PATH = path.resolve(__dirname, '../node_modules');
require('module').Module._initPaths();

const { hashPassword, comparePassword } = require('../src/utils/password');
const { generateToken, verifyToken } = require('../src/utils/token');
const app = require('../src/app');
const { User } = require('../src/models');

/**
 * Lightweight in-memory HTTP caller for Express app
 */
const mockRequest = (app, { method = 'GET', url = '/', headers = {}, body = null }) => {
  return new Promise((resolve, reject) => {
    const socket = {
      remoteAddress: '127.0.0.1',
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

/**
 * Test Runner
 */
const runAuthTests = async () => {
  console.log('========================================================');
  console.log('[CareerPulse ATS] Running Authentication & Security Tests');
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

  // ----------------------------------------------------
  // Unit Test 1: Password Hashing & Verification
  // ----------------------------------------------------
  console.log('Test Suite 1: Password Security (Bcrypt)');
  const rawPassword = 'SecurePassword123!';
  const hash1 = await hashPassword(rawPassword);
  const hash2 = await hashPassword(rawPassword);

  assert(Boolean(hash1 && hash1.startsWith('$2')), 'Generates valid bcrypt hash');
  assert(hash1 !== hash2, 'Uses unique random salts for identical passwords');
  assert(await comparePassword(rawPassword, hash1), 'Correct password matches hash');
  assert(!(await comparePassword('WrongPassword123!', hash1)), 'Incorrect password rejected');

  // ----------------------------------------------------
  // Unit Test 2: JWT Token Operations
  // ----------------------------------------------------
  console.log('\nTest Suite 2: JWT Token Operations');
  const userPayload = { id: '60d0fe4f5311236168a109ca', email: 'candidate@careerpulse.test', role: 'candidate' };
  const validToken = generateToken(userPayload);
  assert(Boolean(validToken && validToken.split('.').length === 3), 'Generates well-formed 3-part JWT');

  const decoded = verifyToken(validToken);
  assert(decoded.id === userPayload.id && decoded.role === userPayload.role, 'Decodes claims accurately');

  let tamperedCaught = false;
  try {
    verifyToken(validToken + 'invalidSignature');
  } catch (_) {
    tamperedCaught = true;
  }
  assert(tamperedCaught, 'Tampered token signature is rejected');

  // ----------------------------------------------------
  // Integration Test 3: Public Registration Restrictions
  // ----------------------------------------------------
  console.log('\nTest Suite 3: Registration Endpoint & Role Enforcement');

  // Test 3a: Admin self-registration rejection
  const adminRegRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      name: 'Malicious Actor',
      email: 'admin_attempt@careerpulse.test',
      password: 'StrongPassword123!',
      role: 'admin',
    },
  });
  assert(adminRegRes.status === 400, 'Rejects self-registration as admin (HTTP 400)');
  assert(adminRegRes.body?.message?.includes('administrator'), 'Explains admin self-registration is forbidden');

  // Test 3b: Invalid role rejection
  const invalidRoleRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      name: 'Unknown User',
      email: 'unknown_role@careerpulse.test',
      password: 'StrongPassword123!',
      role: 'super_admin',
    },
  });
  assert(invalidRoleRes.status === 400, 'Rejects unsupported role registration (HTTP 400)');

  // Test 3c: Weak password validation (< 8 chars)
  const weakPassRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      name: 'Weak Pass User',
      email: 'weakpass@careerpulse.test',
      password: 'short',
      role: 'candidate',
    },
  });
  assert(weakPassRes.status === 400, 'Rejects short password (< 8 chars, HTTP 400)');

  // Test 3d: Invalid email validation
  const badEmailRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      name: 'Bad Email User',
      email: 'not-an-email',
      password: 'ValidPassword123!',
      role: 'candidate',
    },
  });
  assert(badEmailRes.status === 400, 'Rejects invalid email format (HTTP 400)');

  // Test 3e: Duplicate registration handling (HTTP 409)
  const origFindOne = User.findOne;
  User.findOne = () => Promise.resolve({ email: 'duplicate@careerpulse.test' });

  const dupRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      name: 'Duplicate Candidate',
      email: 'duplicate@careerpulse.test',
      password: 'ValidPassword123!',
      role: 'candidate',
    },
  });
  assert(dupRes.status === 409, 'Rejects duplicate email with HTTP 409');
  assert(dupRes.body?.message?.includes('already exists'), 'Duplicate message is clear and standard');

  // Test 3f: Valid registration response (no passwordHash)
  User.findOne = () => Promise.resolve(null);
  const origCreate = User.create;
  User.create = async (userData) => ({
    _id: '60d0fe4f5311236168a109cb',
    name: userData.name,
    email: userData.email,
    role: userData.role,
    createdAt: new Date(),
  });

  const validRegRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/register',
    body: {
      name: 'Jane Doe',
      email: 'jane.doe@careerpulse.test',
      password: 'ValidPassword123!',
      role: 'candidate',
    },
  });
  assert(validRegRes.status === 201, 'Registers valid candidate with HTTP 201');
  assert(Boolean(validRegRes.body?.token), 'Returns signed JWT on successful registration');
  assert(validRegRes.body?.user?.passwordHash === undefined, 'passwordHash is never exposed in registration response');

  // ----------------------------------------------------
  // Integration Test 4: Login Endpoint Credentials Check
  // ----------------------------------------------------
  console.log('\nTest Suite 4: Login Validation & Error Sanitization');

  // Test 4a: Missing credentials
  const missingCredsRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {},
  });
  assert(missingCredsRes.status === 400, 'Rejects missing login credentials (HTTP 400)');

  // Test 4b: Non-existent user credentials
  User.findOne = () => ({
    select: () => Promise.resolve(null),
  });

  const nonExistentRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'nonexistent_user_12345@careerpulse.test',
      password: 'SomePassword123!',
    },
  });
  assert(nonExistentRes.status === 401, 'Rejects unknown user with HTTP 401');
  assert(nonExistentRes.body?.message === 'Invalid email or password.', 'Uses generic credentials error message to avoid enumeration');

  // Test 4c: Existing user with incorrect password
  User.findOne = () => ({
    select: () => Promise.resolve({
      _id: '60d0fe4f5311236168a109cb',
      email: 'test@careerpulse.test',
      passwordHash: hash1, // hash of 'SecurePassword123!'
      isActive: true,
    }),
  });

  const wrongPassRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'test@careerpulse.test',
      password: 'WrongPassword456!',
    },
  });
  assert(wrongPassRes.status === 401, 'Rejects incorrect password with HTTP 401');
  assert(wrongPassRes.body?.message === 'Invalid email or password.', 'Uses identical generic error message for incorrect password');

  // Test 4d: Successful login returns token and safe profile
  User.findOne = () => ({
    select: () => Promise.resolve({
      _id: '60d0fe4f5311236168a109cb',
      name: 'Jane Doe',
      email: 'jane.doe@careerpulse.test',
      role: 'candidate',
      passwordHash: hash1,
      profile: { headline: 'Full-stack Developer' },
      createdAt: new Date(),
      isActive: true,
    }),
  });

  const successfulLoginRes = await mockRequest(app, {
    method: 'POST',
    url: '/api/auth/login',
    body: {
      email: 'jane.doe@careerpulse.test',
      password: rawPassword,
    },
  });
  assert(successfulLoginRes.status === 200, 'Authenticates valid credentials with HTTP 200');
  assert(Boolean(successfulLoginRes.body?.token), 'Returns valid JWT token on login');
  assert(successfulLoginRes.body?.user?.passwordHash === undefined, 'passwordHash is never exposed in login response');

  // Restore original User methods
  User.findOne = origFindOne;
  User.create = origCreate;

  // ----------------------------------------------------
  // Integration Test 5: Authentication & Authorization Middleware
  // ----------------------------------------------------
  console.log('\nTest Suite 5: JWT Authentication & Role Authorization Middleware');

  // Test 5a: Missing token on protected route
  const noTokenRes = await mockRequest(app, {
    method: 'GET',
    url: '/api/auth/candidate-only',
  });
  assert(noTokenRes.status === 401, 'Rejects unauthenticated request without token (HTTP 401)');

  // Test 5b: Candidate token accessing candidate route
  const candidateToken = generateToken({
    id: '60d0fe4f5311236168a109cb',
    email: 'valid_candidate@careerpulse.test',
    role: 'candidate',
  });

  const candOnCandRes = await mockRequest(app, {
    method: 'GET',
    url: '/api/auth/candidate-only',
    headers: { Authorization: `Bearer ${candidateToken}` },
  });
  assert(candOnCandRes.status === 200, 'Candidate token authorized for candidate endpoint (HTTP 200)');

  // Test 5c: Candidate token accessing recruiter route (Forbidden)
  const candOnRecruiterRes = await mockRequest(app, {
    method: 'GET',
    url: '/api/auth/recruiter-only',
    headers: { Authorization: `Bearer ${candidateToken}` },
  });
  assert(candOnRecruiterRes.status === 403, 'Candidate token forbidden from recruiter endpoint (HTTP 403)');

  // Test 5d: Recruiter token accessing recruiter route
  const recruiterToken = generateToken({
    id: '60d0fe4f5311236168a109cc',
    email: 'valid_recruiter@careerpulse.test',
    role: 'recruiter',
  });

  const recOnRecruiterRes = await mockRequest(app, {
    method: 'GET',
    url: '/api/auth/recruiter-only',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert(recOnRecruiterRes.status === 200, 'Recruiter token authorized for recruiter endpoint (HTTP 200)');

  // Test 5e: Recruiter token accessing admin route (Forbidden)
  const recOnAdminRes = await mockRequest(app, {
    method: 'GET',
    url: '/api/auth/admin-only',
    headers: { Authorization: `Bearer ${recruiterToken}` },
  });
  assert(recOnAdminRes.status === 403, 'Recruiter token forbidden from admin endpoint (HTTP 403)');

  // Test 5f: Admin token accessing admin route
  const adminToken = generateToken({
    id: '60d0fe4f5311236168a109cd',
    email: 'system_admin@careerpulse.test',
    role: 'admin',
  });

  const adminOnAdminRes = await mockRequest(app, {
    method: 'GET',
    url: '/api/auth/admin-only',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminOnAdminRes.status === 200, 'Admin token authorized for admin endpoint (HTTP 200)');

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log('\n========================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runAuthTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

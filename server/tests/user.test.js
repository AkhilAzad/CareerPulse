const http = require('http');
const path = require('path');
const mongoose = require('mongoose');

// Ensure module resolution points to server/node_modules
process.env.NODE_PATH = path.resolve(__dirname, '../node_modules');
require('module').Module._initPaths();

const { generateToken } = require('../src/utils/token');
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
      resolve({ status: this.statusCode, body: capturedBody, headers: this.getHeaders ? this.getHeaders() : {} });
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
      resolve({ status: this.statusCode, body: capturedBody, headers: this.getHeaders ? this.getHeaders() : {} });
    };

    const chunks = [];
    res.write = function (chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    };

    res.end = function (chunk) {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      if (!capturedBody) {
        if (chunks.length > 0) {
          const totalBuffer = Buffer.concat(chunks);
          try {
            capturedBody = JSON.parse(totalBuffer.toString());
          } catch (_) {
            capturedBody = totalBuffer.toString();
          }
        }
      }
      resolve({ status: this.statusCode, body: capturedBody, headers: this.getHeaders ? this.getHeaders() : {} });
    };

    app.handle(req, res, (err) => {
      if (err) reject(err);
      else resolve({ status: 404, body: { message: 'Not Found' } });
    });
  });
};

/**
 * Create mock user fixture
 */
const createMockUser = (overrides = {}) => {
  const id = overrides._id || new mongoose.Types.ObjectId();
  const user = {
    _id: id,
    name: 'Jane Candidate',
    email: 'jane@careerpulse.test',
    passwordHash: '$2a$12$eX4mpL3H45hV4Lu3N0tR34L00000000000000000000000000',
    role: 'candidate',
    isActive: true,
    profile: {
      headline: 'Frontend Engineer',
      bio: 'Passionate about building intuitive web applications.',
      phone: '+1-555-0199',
      location: 'San Francisco, CA',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      github: 'https://github.com/janecandidate',
      linkedin: 'https://linkedin.com/in/janecandidate',
      portfolio: 'https://janecandidate.dev',
      twitter: '',
      website: '',
      company: '',
      companyWebsite: '',
      companyDescription: '',
      industry: '',
      companySize: '',
      companyLogo: '',
      headquarters: '',
      companyRegistration: '',
      verificationStatus: 'unverified',
    },
    skills: ['react', 'typescript', 'javascript'],
    education: [
      {
        _id: new mongoose.Types.ObjectId(),
        institution: 'University of California, Berkeley',
        degree: 'Bachelor of Science',
        fieldOfStudy: 'Computer Science',
        startDate: new Date('2018-09-01'),
        endDate: new Date('2022-05-30'),
        current: false,
        description: 'Graduated magna cum laude.',
      },
    ],
    experience: [
      {
        _id: new mongoose.Types.ObjectId(),
        company: 'TechWave Solutions',
        title: 'Software Engineer',
        location: 'San Francisco, CA',
        startDate: new Date('2022-06-01'),
        endDate: null,
        current: true,
        description: 'Building React and Node.js microservices.',
      },
    ],
    projects: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: 'OpenPulse ATS UI',
        description: 'React dashboard for talent management',
        link: 'https://github.com/janecandidate/openpulse',
        technologies: ['React', 'Vite'],
      },
    ],
    certifications: [
      {
        _id: new mongoose.Types.ObjectId(),
        name: 'AWS Certified Cloud Practitioner',
        issuingOrganization: 'Amazon Web Services',
        issueDate: new Date('2023-01-15'),
        credentialId: 'AWS-123456',
        credentialUrl: 'https://aws.amazon.com/verify',
      },
    ],
    resume: {
      originalName: 'Jane_Candidate_Resume.pdf',
      storageKey: 'resumes/mock-id/resume.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 154200,
      uploadedAt: new Date('2026-10-01'),
    },
    jobPreferences: {
      desiredRoles: [],
      preferredCities: [],
      workplaceType: 'any',
      expectedSalary: { min: null, max: null, currency: 'INR' },
      employmentTypes: [],
    },
    ...overrides,
    save: async function () {
      return this;
    },
    calculateCompleteness: function () {
      if (this.role === 'recruiter') {
        let score = 0;
        if (this.name) score += 20;
        if (this.profile?.headline) score += 15;
        if (this.profile?.company) score += 20;
        if (this.profile?.companyWebsite || this.profile?.website) score += 15;
        if (this.profile?.industry) score += 15;
        if (this.profile?.companyDescription || this.profile?.bio) score += 15;
        return Math.min(100, score);
      }
      let score = 0;
      if (this.name) score += 10;
      if (this.profile?.headline) score += 10;
      if (this.profile?.bio) score += 10;
      if (this.profile?.location) score += 10;
      if (this.profile?.phone) score += 10;
      if (this.skills && this.skills.length >= 3) score += 15;
      else if (this.skills && this.skills.length > 0) score += 8;
      if (this.experience && this.experience.length > 0) score += 15;
      if (this.education && this.education.length > 0) score += 10;
      if (this.resume && this.resume.storageKey) score += 10;
      return Math.min(100, score);
    },
    toSafeObject: function () {
      const copy = { ...this };
      delete copy.passwordHash;
      delete copy.__v;
      delete copy.save;
      delete copy.toSafeObject;
      delete copy.calculateCompleteness;
      copy.completeness = this.calculateCompleteness();
      return copy;
    },
  };
  return user;
};

/**
 * User Profile & Resume Test Runner
 */
const runUserTests = async () => {
  console.log('========================================================');
  console.log('[CareerPulse ATS] Running User Profile & Resume Tests');
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

  const candidateId = new mongoose.Types.ObjectId();
  const recruiterId = new mongoose.Types.ObjectId();

  const candidateUser = createMockUser({
    _id: candidateId,
    name: 'Jane Candidate',
    email: 'jane@careerpulse.test',
    role: 'candidate',
  });

  const recruiterUser = createMockUser({
    _id: recruiterId,
    name: 'John Recruiter',
    email: 'john@techcorp.test',
    role: 'recruiter',
    profile: {
      headline: 'Senior Technical Recruiter',
      company: 'TechCorp International',
      companyWebsite: 'https://techcorp.test',
      industry: 'Software & Technology',
      companySize: '500-1000',
      companyDescription: 'Global leader in cloud computing and enterprise tech.',
      companyLogo: 'https://techcorp.test/logo.png',
      location: 'New York, NY',
      headquarters: 'Bengaluru, Karnataka',
      companyRegistration: '',
      verificationStatus: 'unverified',
    },
    skills: [],
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    resume: null,
  });

  const candidateToken = generateToken({
    id: candidateId.toString(),
    email: candidateUser.email,
    role: candidateUser.role,
  });

  const recruiterToken = generateToken({
    id: recruiterId.toString(),
    email: recruiterUser.email,
    role: recruiterUser.role,
  });

  // Mock User.findById
  const origFindById = User.findById;
  User.findById = (id) => {
    const idStr = id?.toString ? id.toString() : String(id);
    if (idStr === candidateId.toString()) {
      return Promise.resolve(candidateUser);
    }
    if (idStr === recruiterId.toString()) {
      return Promise.resolve(recruiterUser);
    }
    return Promise.resolve(null);
  };

  try {
    // ------------------------------------------------------------------
    // Suite 1: Authentication & Authorization on /api/users/profile
    // ------------------------------------------------------------------
    console.log('Test Suite 1: Profile Authentication Guarding');

    const unauthGet = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/profile',
    });
    assert(unauthGet.status === 401, 'GET /api/users/profile without token returns 401');

    const invalidTokenGet = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/profile',
      headers: { Authorization: 'Bearer not-a-valid-token' },
    });
    assert(invalidTokenGet.status === 401, 'GET /api/users/profile with malformed token returns 401');

    const unauthPatch = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      body: { name: 'Unauthorized Change' },
    });
    assert(unauthPatch.status === 401, 'PATCH /api/users/profile without token returns 401');

    const unauthResumePost = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/resume',
      body: { originalName: 'Resume.pdf' },
    });
    assert(unauthResumePost.status === 401, 'POST /api/users/resume without token returns 401');

    const unauthResumeDelete = await mockRequest(app, {
      method: 'DELETE',
      url: '/api/users/resume',
    });
    assert(unauthResumeDelete.status === 401, 'DELETE /api/users/resume without token returns 401');

    // ------------------------------------------------------------------
    // Suite 2: GET /api/users/profile
    // ------------------------------------------------------------------
    console.log('\nTest Suite 2: Fetch Profile');

    const candidateProfileRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });

    assert(candidateProfileRes.status === 200, 'Candidate profile retrieved successfully (200)');
    assert(candidateProfileRes.body.success === true, 'Response indicates success: true');
    assert(candidateProfileRes.body.data.name === 'Jane Candidate', 'Matches authenticated candidate name');
    assert(candidateProfileRes.body.data.email === 'jane@careerpulse.test', 'Matches candidate email');
    assert(candidateProfileRes.body.data.passwordHash === undefined, 'Never exposes passwordHash in response');
    assert(typeof candidateProfileRes.body.data.completeness === 'number', 'Includes computed completeness score');
    assert(candidateProfileRes.body.data.completeness > 50, 'Candidate completeness calculation is accurate');
    assert(Array.isArray(candidateProfileRes.body.data.skills), 'Returns candidate skills array');
    assert(Array.isArray(candidateProfileRes.body.data.education), 'Returns candidate education array');
    assert(Array.isArray(candidateProfileRes.body.data.experience), 'Returns candidate experience array');
    assert(Array.isArray(candidateProfileRes.body.data.projects), 'Returns candidate projects array');
    assert(Array.isArray(candidateProfileRes.body.data.certifications), 'Returns candidate certifications array');
    assert(Boolean(candidateProfileRes.body.data.resume?.originalName), 'Returns candidate resume metadata');

    const recruiterProfileRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${recruiterToken}` },
    });
    assert(recruiterProfileRes.status === 200, 'Recruiter profile retrieved successfully (200)');
    assert(recruiterProfileRes.body.data.role === 'recruiter', 'Returns recruiter role accurately');
    assert(recruiterProfileRes.body.data.profile.company === 'TechCorp International', 'Returns recruiter company details');
    assert(typeof recruiterProfileRes.body.data.completeness === 'number', 'Includes recruiter completeness score');

    // ------------------------------------------------------------------
    // Suite 3: PATCH /api/users/profile - Input Validation & Security
    // ------------------------------------------------------------------
    console.log('\nTest Suite 3: Update Profile & Protected Fields Whitelisting');

    // Test name validation
    const invalidNameRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: { name: 'A' },
    });
    assert(invalidNameRes.status === 400, 'Reject name less than 2 characters (400)');

    // Test education validation
    const invalidEduRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: { education: 'not an array' },
    });
    assert(invalidEduRes.status === 400, 'Reject non-array education (400)');

    // Test experience validation
    const invalidExpRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: { experience: 'not an array' },
    });
    assert(invalidExpRes.status === 400, 'Reject non-array experience (400)');

    // Test projects validation
    const invalidProjRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: { projects: 'not an array' },
    });
    assert(invalidProjRes.status === 400, 'Reject non-array projects (400)');

    // Test certifications validation
    const invalidCertRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: { certifications: 'not an array' },
    });
    assert(invalidCertRes.status === 400, 'Reject non-array certifications (400)');

    // Protected field tampering attempt
    const tamperRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        name: 'Jane Updated Candidate',
        email: 'hacked@evil.test',
        role: 'admin',
        passwordHash: '$2a$12$injectedHash',
        isActive: false,
        _id: '60d0fe4f5311236168a10999',
        profile: {
          headline: 'Lead Full-Stack Developer',
          location: 'San Jose, CA',
        },
      },
    });

    assert(tamperRes.status === 200, 'Profile update succeeds for valid whitelisted fields');
    assert(candidateUser.name === 'Jane Updated Candidate', 'Whitelisted field name was updated');
    assert(candidateUser.profile.headline === 'Lead Full-Stack Developer', 'Whitelisted profile headline was updated');
    assert(candidateUser.profile.location === 'San Jose, CA', 'Whitelisted profile location was updated');
    assert(candidateUser.email === 'jane@careerpulse.test', 'Security: email modification was rejected / stripped');
    assert(candidateUser.role === 'candidate', 'Security: role tampering was rejected / stripped');
    assert(candidateUser.passwordHash !== '$2a$12$injectedHash', 'Security: passwordHash injection was blocked');
    assert(candidateUser.isActive === true, 'Security: isActive cannot be tampered');
    assert(candidateUser._id.toString() === candidateId.toString(), 'Security: _id cannot be overwritten');

    // ------------------------------------------------------------------
    // Suite 4: PATCH Skills, Education, Experience, Projects
    // ------------------------------------------------------------------
    console.log('\nTest Suite 4: Candidate Sections Update');

    const updateSectionsRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        skills: ['React', 'Node.js', 'PostgreSQL', 'GraphQL'],
        education: [
          {
            institution: 'Stanford University',
            degree: 'Master of Science',
            fieldOfStudy: 'Software Systems',
            startDate: '2022-09-01',
            endDate: '2024-06-01',
            current: false,
            description: 'Advanced distributed systems research.',
          },
        ],
        experience: [
          {
            company: 'NextGen Cloud',
            title: 'Senior Software Engineer',
            location: 'Remote',
            startDate: '2024-07-01',
            endDate: null,
            current: true,
            description: 'Leading platform infrastructure architecture.',
          },
        ],
      },
    });

    assert(updateSectionsRes.status === 200, 'Sections update returns 200');
    assert(candidateUser.skills.length === 4, 'Skills list was replaced with 4 entries');
    assert(candidateUser.skills.includes('node.js'), 'Skills are normalized to lowercase');
    assert(candidateUser.education[0].institution === 'Stanford University', 'Education was updated');
    assert(candidateUser.experience[0].company === 'NextGen Cloud', 'Experience was updated');

    // Comma-separated string skills support
    const stringSkillsRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        skills: 'Vue, Docker, Kubernetes',
      },
    });
    assert(stringSkillsRes.status === 200, 'Comma-separated skills string accepted');
    assert(candidateUser.skills.includes('docker'), 'Parsed and normalized docker skill');

    // ------------------------------------------------------------------
    // Suite 5: Recruiter Company Profile Update
    // ------------------------------------------------------------------
    console.log('\nTest Suite 5: Recruiter Company Details Update');

    const recruiterUpdateRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${recruiterToken}` },
      body: {
        name: 'John Recruiter Senior',
        profile: {
          headline: 'Head of Talent Acquisition',
          company: 'HyperScale AI',
          companyWebsite: 'https://hyperscale.ai',
          industry: 'Artificial Intelligence',
          companySize: '100-250',
          companyDescription: 'Pioneering generative models.',
          headquarters: 'Bengaluru, Karnataka',
          companyRegistration: 'U72200KA2021PTC148000',
          verificationStatus: 'verified', // Unauthorized attempt to self-verify
        },
      },
    });

    assert(recruiterUpdateRes.status === 200, 'Recruiter profile updated successfully (200)');
    assert(recruiterUser.name === 'John Recruiter Senior', 'Recruiter name updated');
    assert(recruiterUser.profile.company === 'HyperScale AI', 'Company name updated');
    assert(recruiterUser.profile.companyWebsite === 'https://hyperscale.ai', 'Company website updated');
    assert(recruiterUser.profile.industry === 'Artificial Intelligence', 'Industry updated');
    assert(recruiterUser.profile.headquarters === 'Bengaluru, Karnataka', 'Indian headquarters updated');
    assert(recruiterUser.profile.companyRegistration === 'U72200KA2021PTC148000', 'Indian company registration (CIN) updated');
    assert(recruiterUser.profile.verificationStatus === 'pending', 'Verification status set to pending on registration, unauthorized verified spoof rejected');

    // ------------------------------------------------------------------
    // Suite 6: Resume Metadata Endpoints
    // ------------------------------------------------------------------
    console.log('\nTest Suite 6: Resume Upload & Delete Operations');

    const missingNameResumeRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/resume',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: { sizeBytes: 1000 },
    });
    assert(missingNameResumeRes.status === 400, 'POST /api/users/resume requires originalName (400)');

    const validResumeRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/resume',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'Jane_Doe_CV_2026.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 245000,
      },
    });
    assert(validResumeRes.status === 200, 'POST /api/users/resume saves metadata (200)');
    assert(candidateUser.resume.originalName === 'Jane_Doe_CV_2026.pdf', 'Resume originalName saved');
    assert(Boolean(candidateUser.resume.storageKey), 'Generates secure storageKey');
    assert(candidateUser.resume.sizeBytes === 245000, 'Preserves resume size in bytes');

    const deleteResumeRes = await mockRequest(app, {
      method: 'DELETE',
      url: '/api/users/resume',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert(deleteResumeRes.status === 200, 'DELETE /api/users/resume clears metadata (200)');
    assert(candidateUser.resume === null, 'Candidate resume reset to null');

    // ------------------------------------------------------------------
    // Suite 7: Candidate Job Preferences Endpoints & Validation
    // ------------------------------------------------------------------
    console.log('\nTest Suite 7: Candidate Job Preferences & Indian Market Settings');

    // Reject invalid workplaceType
    const invalidWorkplaceRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        jobPreferences: { workplaceType: 'invalid_mode' },
      },
    });
    assert(invalidWorkplaceRes.status === 400, 'Rejects invalid workplace type (HTTP 400)');

    // Reject maxSalary < minSalary
    const invalidSalaryRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        jobPreferences: {
          expectedSalary: { min: 25, max: 10, currency: 'INR' },
        },
      },
    });
    assert(invalidSalaryRes.status === 400, 'Rejects expected salary where max < min (HTTP 400)');

    // Reject negative salary
    const negativeSalaryRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        jobPreferences: {
          expectedSalary: { min: -5, max: 10 },
        },
      },
    });
    assert(negativeSalaryRes.status === 400, 'Rejects negative expected salary (HTTP 400)');

    // Valid jobPreferences update
    const validPrefsRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        jobPreferences: {
          desiredRoles: ['Full Stack Engineer', 'Backend Developer'],
          preferredCities: ['Bengaluru, Karnataka', 'Pune, Maharashtra'],
          workplaceType: 'hybrid',
          expectedSalary: { min: 14, max: 22, currency: 'INR' },
          employmentTypes: ['Full-time', 'Contract'],
        },
      },
    });
    assert(validPrefsRes.status === 200, 'Updates candidate job preferences successfully (HTTP 200)');
    assert(candidateUser.jobPreferences.workplaceType === 'hybrid', 'Workplace preference saved as hybrid');
    assert(candidateUser.jobPreferences.desiredRoles.length === 2, 'Saves 2 desired roles');
    assert(candidateUser.jobPreferences.preferredCities.includes('Bengaluru, Karnataka'), 'Preserves preferred Indian cities');
    assert(candidateUser.jobPreferences.expectedSalary.min === 14, 'Preserves min expected salary in LPA');
    assert(candidateUser.jobPreferences.expectedSalary.max === 22, 'Preserves max expected salary in LPA');

    // ------------------------------------------------------------------
    // Suite 8: Secure Resume Download & File Upload
    // ------------------------------------------------------------------
    console.log('\nTest Suite 8: Secure Resume Download & Upload Validation');

    // Unauthenticated download rejected
    const unauthDownload = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/resume/download',
    });
    assert(unauthDownload.status === 401, 'Unauthenticated resume download returns HTTP 401');

    // Download when resume exists
    candidateUser.resume = {
      originalName: 'Jane_Candidate_CV.pdf',
      storageKey: 'resumes/mock-id/Jane_Candidate_CV.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 154000,
      uploadedAt: new Date(),
    };
    const validDownload = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/resume/download',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert(validDownload.status === 200, 'Authenticated user can download resume (HTTP 200)');

    // Download when resume is null returns 404
    candidateUser.resume = null;
    const nullResumeDownload = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/resume/download',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert(nullResumeDownload.status === 404, 'Download returns HTTP 404 when no resume attached');

    // Rejects resume file exceeding 5MB
    const oversizedResumeRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/resume',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'Huge_Resume.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 6 * 1024 * 1024, // 6 MB
      },
    });
    assert(oversizedResumeRes.status === 400, 'Rejects resume file exceeding 5 MB limit (HTTP 400)');

    // Rejects unsupported resume extension (e.g. .exe)
    const invalidTypeResume = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/resume',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'Malware_CV.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 12000,
      },
    });
    assert(invalidTypeResume.status === 400, 'Rejects unsupported file format .exe (HTTP 400)');

    // Upload with valid base64 file data
    const base64ResumeRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/resume',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'Jane_Valid_CV.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1500,
        fileData: 'JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDIgMCBS',
      },
    });
    assert(base64ResumeRes.status === 200, 'Uploads resume with binary fileData securely (HTTP 200)');
    assert(candidateUser.resume.originalName === 'Jane_Valid_CV.pdf', 'Stores uploaded resume filename');

    // ------------------------------------------------------------------
    // Suite 9: Profile Photo Avatar Upload, Streaming & Deletion
    // ------------------------------------------------------------------
    console.log('\nTest Suite 9: Profile Photo Avatar Upload, Streaming & Deletion');

    // 1. Unauthenticated avatar upload rejected
    const unauthAvatarRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/avatar',
      body: {
        originalName: 'photo.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1000,
        fileData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      },
    });
    assert(unauthAvatarRes.status === 401, 'Unauthenticated POST /api/users/avatar returns HTTP 401');

    // 2. Rejects avatar file exceeding 2MB limit
    const oversizedAvatarRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/avatar',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'large_photo.png',
        mimeType: 'image/png',
        sizeBytes: 3 * 1024 * 1024, // 3 MB
        fileData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
    });
    assert(oversizedAvatarRes.status === 400, 'Rejects avatar exceeding 2 MB size limit (HTTP 400)');

    // 3. Rejects unsupported avatar file format (e.g. .exe)
    const invalidExtAvatarRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/avatar',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'malware.exe',
        mimeType: 'application/octet-stream',
        sizeBytes: 5000,
        fileData: 'data:application/octet-stream;base64,TVqQAAMAAAAEAAAA',
      },
    });
    assert(invalidExtAvatarRes.status === 400, 'Rejects unsupported avatar extension .exe (HTTP 400)');

    // 4. Block arbitrary external image URL injection in PATCH /api/users/profile
    const externalAvatarRes = await mockRequest(app, {
      method: 'PATCH',
      url: '/api/users/profile',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        profile: {
          avatarUrl: 'https://attacker.site/tracker.png',
        },
      },
    });
    assert(externalAvatarRes.status === 200, 'Profile update succeeds');
    assert(candidateUser.profile.avatarUrl !== 'https://attacker.site/tracker.png', 'External avatar URL injection was blocked/sanitized');

    // 5. Valid avatar upload with base64 PNG data
    const validPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadAvatarRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/users/avatar',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        originalName: 'candidate-avatar.png',
        mimeType: 'image/png',
        sizeBytes: 120,
        fileData: validPngBase64,
      },
    });
    assert(uploadAvatarRes.status === 200, 'Uploads valid base64 avatar successfully (HTTP 200)');
    assert(uploadAvatarRes.body.data && uploadAvatarRes.body.data.avatarUrl, 'Returns avatarUrl in response data');
    assert(candidateUser.profile.avatarUrl.startsWith(`/api/users/${candidateId}/avatar`), 'Sets internal relative avatar URL on user profile');

    // 6. Public GET /api/users/:id/avatar streams photo or returns SVG fallback
    const getAvatarRes = await mockRequest(app, {
      method: 'GET',
      url: `/api/users/${candidateId}/avatar`,
    });
    assert(getAvatarRes.status === 200, 'Public GET /api/users/:id/avatar returns HTTP 200');
    assert(
      getAvatarRes.headers?.['cross-origin-resource-policy'] === 'cross-origin',
      'Streams avatar with cross-origin CORP header'
    );

    // 7. Invalid ObjectId for GET /api/users/:id/avatar returns HTTP 400
    const invalidIdAvatarRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/users/invalid-id/avatar',
    });
    assert(invalidIdAvatarRes.status === 400, 'Invalid user ID returns HTTP 400');

    // 8. Unauthenticated DELETE /api/users/avatar rejected
    const unauthDeleteAvatar = await mockRequest(app, {
      method: 'DELETE',
      url: '/api/users/avatar',
    });
    assert(unauthDeleteAvatar.status === 401, 'Unauthenticated DELETE /api/users/avatar returns HTTP 401');

    // 9. Authenticated DELETE /api/users/avatar clears avatar
    const deleteAvatarRes = await mockRequest(app, {
      method: 'DELETE',
      url: '/api/users/avatar',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert(deleteAvatarRes.status === 200, 'DELETE /api/users/avatar returns HTTP 200');
    assert(candidateUser.profile.avatarUrl === '', 'Avatar URL reset to empty string after removal');

  } finally {
    // Restore User mock
    User.findById = origFindById;
  }

  console.log('\n========================================================');
  console.log(`[User Profile Tests Summary] Passed: ${passed} | Failed: ${failed}`);
  console.log('========================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
};

runUserTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

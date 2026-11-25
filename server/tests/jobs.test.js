const http = require('http');
const path = require('path');
const mongoose = require('mongoose');

// Ensure module resolution points to server/node_modules
process.env.NODE_PATH = path.resolve(__dirname, '../node_modules');
require('module').Module._initPaths();

const { generateToken } = require('../src/utils/token');
const app = require('../src/app');
const { Job } = require('../src/models');

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
 * Isolated In-Memory Job Storage for Testing
 * Ensures zero interference with real MongoDB Atlas records.
 */
const createInMemoryJobStore = () => {
  const recruiter1Id = new mongoose.Types.ObjectId();
  const recruiter2Id = new mongoose.Types.ObjectId();
  const candidateId = new mongoose.Types.ObjectId();

  const publishedJobId = new mongoose.Types.ObjectId();
  const draftJobId = new mongoose.Types.ObjectId();
  const closedJobId = new mongoose.Types.ObjectId();

  const store = [
    {
      _id: publishedJobId,
      recruiter: recruiter1Id,
      title: 'Senior Frontend Engineer',
      company: 'CareerPulse Labs',
      description: 'Building modern UI with React and TypeScript',
      location: 'San Francisco, CA (Hybrid)',
      employmentType: 'Full-time',
      category: 'engineering',
      requiredSkills: ['React', 'TypeScript', 'Tailwind'],
      salaryRange: { min: 140000, max: 180000, currency: 'USD', period: 'yearly' },
      status: 'published',
      featured: true,
      applicantCount: 5,
      createdAt: new Date('2026-10-01'),
      updatedAt: new Date('2026-10-01'),
      save: async function () {
        return this;
      },
    },
    {
      _id: draftJobId,
      recruiter: recruiter1Id,
      title: 'Draft Backend Developer',
      company: 'CareerPulse Labs',
      description: 'Unpublished draft job listing',
      location: 'Remote',
      employmentType: 'Full-time',
      category: 'engineering',
      requiredSkills: ['Node.js', 'MongoDB'],
      status: 'draft',
      featured: false,
      applicantCount: 0,
      createdAt: new Date('2026-10-05'),
      updatedAt: new Date('2026-10-05'),
      save: async function () {
        return this;
      },
    },
    {
      _id: closedJobId,
      recruiter: recruiter2Id,
      title: 'Lead Product Designer',
      company: 'DesignFlow Inc',
      description: 'Closed design leadership role',
      location: 'New York, NY',
      employmentType: 'Contract',
      category: 'design',
      requiredSkills: ['Figma', 'UI/UX'],
      status: 'closed',
      featured: false,
      applicantCount: 12,
      createdAt: new Date('2026-09-15'),
      updatedAt: new Date('2026-10-10'),
      save: async function () {
        return this;
      },
    },
  ];

  return {
    store,
    recruiter1Id,
    recruiter2Id,
    candidateId,
    publishedJobId,
    draftJobId,
    closedJobId,
  };
};

/**
 * Jobs API Test Runner
 */
const runJobTests = async () => {
  console.log('========================================================');
  console.log('[CareerPulse ATS] Running Jobs API & Security Tests');
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

  const fixtures = createInMemoryJobStore();
  const recruiter1Token = generateToken({
    id: fixtures.recruiter1Id.toString(),
    email: 'recruiter1@careerpulse.test',
    role: 'recruiter',
  });
  const recruiter2Token = generateToken({
    id: fixtures.recruiter2Id.toString(),
    email: 'recruiter2@careerpulse.test',
    role: 'recruiter',
  });
  const candidateToken = generateToken({
    id: fixtures.candidateId.toString(),
    email: 'candidate@careerpulse.test',
    role: 'candidate',
  });

  // Backup original Job static methods
  const origFind = Job.find;
  const origFindById = Job.findById;
  const origCountDocuments = Job.countDocuments;
  const origCreate = Job.create;

  // Helper to match Mongoose regex queries in mock
  const regexMatch = (pattern, text) => {
    if (!pattern || !text) return false;
    const str = typeof pattern === 'string' ? pattern : pattern.$regex || String(pattern);
    const flags = pattern.$options || 'i';
    try {
      return new RegExp(str, flags).test(text);
    } catch (_) {
      return false;
    }
  };

  // Mock Mongoose Query Builder for Job.find()
  Job.find = (filter = {}) => {
    let result = fixtures.store.filter((job) => {
      if (filter.status && job.status !== filter.status) return false;
      if (filter.recruiter && job.recruiter.toString() !== filter.recruiter.toString()) return false;
      if (filter.employmentType && job.employmentType !== filter.employmentType) return false;
      if (filter.category && job.category !== filter.category) return false;
      if (filter.featured !== undefined && job.featured !== filter.featured) return false;
      if (filter.location && !regexMatch(filter.location, job.location)) return false;
      if (filter.workplaceType && job.workplaceType !== filter.workplaceType) return false;
      if (filter.experienceLevel && job.experienceLevel !== filter.experienceLevel) return false;
      if (filter['salaryRange.max'] && job.salaryRange?.max != null && job.salaryRange.max < filter['salaryRange.max'].$gte) return false;
      if (filter['salaryRange.min'] && job.salaryRange?.min != null && job.salaryRange.min > filter['salaryRange.min'].$lte) return false;
      if (filter.$or) {
        const matchesOr = filter.$or.some((clause) => {
          if (clause.title && regexMatch(clause.title, job.title)) return true;
          if (clause.company && regexMatch(clause.company, job.company)) return true;
          if (clause.location && regexMatch(clause.location, job.location)) return true;
          return false;
        });
        if (!matchesOr) return false;
      }
      return true;
    });

    const queryObj = {
      sort: () => queryObj,
      skip: (s) => {
        result = result.slice(s);
        return queryObj;
      },
      limit: (l) => {
        result = result.slice(0, l);
        return queryObj;
      },
      populate: () => queryObj,
      lean: () => Promise.resolve(result),
      then: (resolve) => resolve(result),
    };
    return queryObj;
  };

  Job.countDocuments = (filter = {}) => {
    const matched = fixtures.store.filter((job) => {
      if (filter.status && job.status !== filter.status) return false;
      if (filter.recruiter && job.recruiter.toString() !== filter.recruiter.toString()) return false;
      if (filter.employmentType && job.employmentType !== filter.employmentType) return false;
      if (filter.category && job.category !== filter.category) return false;
      return true;
    });
    return Promise.resolve(matched.length);
  };

  Job.findById = (id) => {
    const job = fixtures.store.find((j) => j._id.toString() === id.toString());
    const queryObj = {
      populate: () => Promise.resolve(job || null),
      then: (resolve) => resolve(job || null),
    };
    return queryObj;
  };

  Job.create = (jobData) => {
    const newJob = {
      _id: new mongoose.Types.ObjectId(),
      ...jobData,
      applicantCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        return this;
      },
    };
    fixtures.store.push(newJob);
    return Promise.resolve(newJob);
  };

  try {
    // ----------------------------------------------------
    // Test Suite 1: Recruiter Job Creation
    // ----------------------------------------------------
    console.log('Test Suite 1: POST /api/jobs (Recruiter Job Creation)');

    // 1a: Valid creation by recruiter
    const createRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Full Stack Node Developer',
        company: 'Veloce Systems',
        description: 'Design and build resilient enterprise microservices.',
        location: 'Austin, TX (Remote)',
        employmentType: 'Full-time',
        category: 'engineering',
        requiredSkills: ['Node.js', 'Express', 'MongoDB'],
        salaryRange: { min: 120000, max: 150000, currency: 'USD', period: 'yearly' },
      },
    });

    assert(createRes.status === 201, 'Recruiter creates a job successfully (HTTP 201)');
    assert(createRes.body?.data?.title === 'Full Stack Node Developer', 'Saved job has matching title');
    assert(
      createRes.body?.data?.recruiter?.toString() === fixtures.recruiter1Id.toString(),
      'Recruiter ID is derived strictly from verified JWT'
    );

    // 1b: Candidate forbidden from creating jobs
    const candidateCreateRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        title: 'Unauthorized Candidate Job',
        company: 'Fake Corp',
        description: 'Should be rejected',
        location: 'Remote',
        employmentType: 'Full-time',
      },
    });
    assert(candidateCreateRes.status === 403, 'Candidate forbidden from creating jobs (HTTP 403)');

    // 1c: Unauthenticated request rejected
    const unauthCreateRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      body: {
        title: 'Unauthenticated Job',
        company: 'Fake Corp',
        description: 'Should be rejected',
        location: 'Remote',
        employmentType: 'Full-time',
      },
    });
    assert(unauthCreateRes.status === 401, 'Unauthenticated job creation rejected (HTTP 401)');

    // 1d: Validation failure on missing fields
    const missingFieldRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Incomplete Job',
      },
    });
    assert(missingFieldRes.status === 400, 'Rejects creation with missing required fields (HTTP 400)');

    // 1e: Validation failure on invalid employment type
    const invalidTypeRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Invalid Employment Job',
        company: 'Tech LLC',
        description: 'A good description',
        location: 'Remote',
        employmentType: 'Voluntary', // invalid
      },
    });
    assert(invalidTypeRes.status === 400, 'Rejects unsupported employment type (HTTP 400)');

    // ----------------------------------------------------
    // Test Suite 2: Public Job Listing & Filtering
    // ----------------------------------------------------
    console.log('\nTest Suite 2: GET /api/jobs (Public Listing, Search & Filters)');

    // 2a: Public list returns published jobs only
    const publicListRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs',
    });
    assert(publicListRes.status === 200, 'Public listing returns HTTP 200');
    assert(Array.isArray(publicListRes.body?.data), 'Response data is an array of jobs');
    assert(
      publicListRes.body?.data?.every((j) => j.status === 'published'),
      'Strictly excludes draft and closed jobs from public listing'
    );
    assert(publicListRes.body?.page === 1, 'Includes pagination page metadata');
    assert(typeof publicListRes.body?.total === 'number', 'Includes pagination total count');

    // 2b: Keyword search
    const searchRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?search=frontend',
    });
    assert(searchRes.status === 200, 'Keyword search executes successfully (HTTP 200)');
    assert(
      searchRes.body?.data?.some((j) => j.title.includes('Frontend')),
      'Returns matching job title for keyword search'
    );

    // 2c: Filter by location
    const locationRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?location=remote',
    });
    assert(locationRes.status === 200, 'Location filter returns HTTP 200');

    // 2d: Filter by employmentType
    const typeRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?employmentType=Full-time',
    });
    assert(typeRes.status === 200, 'Employment type filter returns HTTP 200');

    // 2e: Pagination limits capped at max (50)
    const bigLimitRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?limit=500',
    });
    assert(bigLimitRes.body?.limit === 50, 'Page limit is safely clamped to maximum of 50');

    // ----------------------------------------------------
    // Test Suite 3: GET /api/jobs/:id (Public Job Detail)
    // ----------------------------------------------------
    console.log('\nTest Suite 3: GET /api/jobs/:id (Detail Retrieval)');

    // 3a: Get published job by valid ID
    const getJobRes = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${fixtures.publishedJobId}`,
    });
    assert(getJobRes.status === 200, 'Retrieves published job by valid ID (HTTP 200)');
    assert(getJobRes.body?.data?._id?.toString() === fixtures.publishedJobId.toString(), 'Matches requested job ID');

    // 3b: Draft job returns 404 on public route
    const getDraftRes = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${fixtures.draftJobId}`,
    });
    assert(getDraftRes.status === 404, 'Draft job returns HTTP 404 on public route');

    // 3c: Closed job returns 404 on public route
    const getClosedRes = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${fixtures.closedJobId}`,
    });
    assert(getClosedRes.status === 404, 'Closed job returns HTTP 404 on public route');

    // 3d: Non-existent ObjectId returns 404
    const notFoundId = new mongoose.Types.ObjectId();
    const notFoundRes = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${notFoundId}`,
    });
    assert(notFoundRes.status === 404, 'Non-existent job ID returns HTTP 404');

    // 3e: Malformed ID returns 400
    const malformedRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs/not-a-valid-object-id',
    });
    assert(malformedRes.status === 400, 'Malformed job ID returns HTTP 400 Bad Request');

    // ----------------------------------------------------
    // Test Suite 4: PATCH /api/jobs/:id (Job Editing & Ownership)
    // ----------------------------------------------------
    console.log('\nTest Suite 4: PATCH /api/jobs/:id (Editing & IDOR Prevention)');

    // 4a: Owning recruiter updates job
    const updateRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.publishedJobId}`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Staff Frontend Engineer',
        salaryRange: { min: 160000, max: 200000, currency: 'USD', period: 'yearly' },
      },
    });
    assert(updateRes.status === 200, 'Owning recruiter updates job successfully (HTTP 200)');
    assert(updateRes.body?.data?.title === 'Staff Frontend Engineer', 'Job title updated');

    // 4b: Protected fields cannot be overridden
    const tamperRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.publishedJobId}`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        recruiter: fixtures.recruiter2Id.toString(), // Attempting to transfer ownership
        applicantCount: 9999, // Attempting to spoof applicant count
      },
    });
    assert(tamperRes.status === 200, 'Update request completes');
    assert(
      fixtures.store.find((j) => j._id === fixtures.publishedJobId).recruiter.toString() ===
        fixtures.recruiter1Id.toString(),
      'Protected recruiter field remains unchanged'
    );

    // 4c: Different recruiter forbidden (IDOR prevention)
    const idorRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.publishedJobId}`,
      headers: { Authorization: `Bearer ${recruiter2Token}` }, // recruiter 2 does not own this job
      body: {
        title: 'Hijacked Job Title',
      },
    });
    assert(idorRes.status === 403, 'Non-owning recruiter is forbidden from modifying job (IDOR prevented, HTTP 403)');

    // 4d: Candidate forbidden from updating job
    const candUpdateRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.publishedJobId}`,
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: {
        title: 'Candidate Edits Job',
      },
    });
    assert(candUpdateRes.status === 403, 'Candidate is forbidden from updating job (HTTP 403)');

    // ----------------------------------------------------
    // Test Suite 5: PATCH /api/jobs/:id/status (Publication Lifecycle)
    // ----------------------------------------------------
    console.log('\nTest Suite 5: PATCH /api/jobs/:id/status (Lifecycle Management)');

    // 5a: Owning recruiter publishes draft job
    const pubRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.draftJobId}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'published' },
    });
    assert(pubRes.status === 200, 'Owning recruiter publishes draft job (HTTP 200)');
    assert(pubRes.body?.data?.status === 'published', 'Job status changed to published');

    // 5b: Owning recruiter closes job
    const closeRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.draftJobId}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'closed' },
    });
    assert(closeRes.status === 200, 'Owning recruiter closes job (HTTP 200)');
    assert(closeRes.body?.data?.status === 'closed', 'Job status changed to closed');

    // 5c: Invalid status rejected
    const badStatusRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.draftJobId}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'archived_deleted' }, // invalid status
    });
    assert(badStatusRes.status === 400, 'Invalid status rejected (HTTP 400)');

    // 5d: Non-owning recruiter forbidden from changing status
    const idorStatusRes = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/jobs/${fixtures.closedJobId}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` }, // closedJobId owned by recruiter2
      body: { status: 'published' },
    });
    assert(idorStatusRes.status === 403, 'Non-owning recruiter forbidden from changing status (HTTP 403)');

    // ----------------------------------------------------
    // Test Suite 6: GET /api/jobs/mine (Recruiter Own Jobs)
    // ----------------------------------------------------
    console.log('\nTest Suite 6: GET /api/jobs/mine (Recruiter Dashboard Listing)');

    // 6a: Recruiter retrieves their own jobs (includes draft & closed)
    const mineRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs/mine',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
    });
    assert(mineRes.status === 200, 'Recruiter retrieves own jobs list (HTTP 200)');
    assert(Array.isArray(mineRes.body?.data), 'Response data is an array of jobs');
    assert(
      mineRes.body?.data?.every((j) => j.recruiter.toString() === fixtures.recruiter1Id.toString()),
      'Only returns jobs belonging to the authenticated recruiter'
    );

    // 6b: Candidate forbidden from /mine
    const candMineRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs/mine',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    assert(candMineRes.status === 403, 'Candidate forbidden from recruiter own jobs endpoint (HTTP 403)');

    // 6c: Unauthenticated request rejected
    const unauthMineRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs/mine',
    });
    assert(unauthMineRes.status === 401, 'Unauthenticated request to /mine rejected (HTTP 401)');

    // ----------------------------------------------------
    // Test Suite 7: India-First Localization & Validation
    // ----------------------------------------------------
    console.log('\nTest Suite 7: India-First Localization & Compensation Validation');

    // 7a: Create job with INR currency and LPA salary range
    const indiaJobRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Lead Backend Engineer (Go / Distributed Systems)',
        company: 'Bangalore Cloud Labs',
        description: 'Building high throughput systems for Indian fintechs.',
        location: 'Bengaluru, Karnataka',
        employmentType: 'Full-time',
        workplaceType: 'hybrid',
        experienceLevel: 'senior',
        category: 'engineering',
        requiredSkills: ['Go', 'PostgreSQL', 'Kafka'],
        salaryRange: { min: 2500000, max: 3500000, currency: 'INR', period: 'yearly' },
      },
    });
    assert(indiaJobRes.status === 201, 'Creates India-first job with INR salary in LPA (HTTP 201)');
    assert(indiaJobRes.body?.data?.salaryRange?.currency === 'INR', 'Currency defaults or stores as INR');
    assert(indiaJobRes.body?.data?.location === 'Bengaluru, Karnataka', 'Location is preserved as Bengaluru');

    // 7b: Create internship opening with stipend period
    const internJobRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Full-Stack Developer Intern',
        company: 'Bangalore Cloud Labs',
        description: 'Exciting internship for freshers and college students.',
        location: 'Hyderabad, Telangana',
        employmentType: 'Internship',
        workplaceType: 'remote',
        experienceLevel: 'fresher',
        category: 'engineering',
        requiredSkills: ['React', 'JavaScript'],
        salaryRange: { min: 25000, max: 40000, currency: 'INR', period: 'stipend' },
      },
    });
    assert(internJobRes.status === 201, 'Creates internship role with stipend period (HTTP 201)');
    assert(internJobRes.body?.data?.salaryRange?.period === 'stipend', 'Stores pay period as stipend');
    assert(internJobRes.body?.data?.experienceLevel === 'fresher', 'Stores experienceLevel as fresher');

    // 7c: Create job with 'Hybrid' and 'On-site' employment types
    const hybridJobRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'DevOps Engineer',
        company: 'Pune Systems',
        description: 'Managing cloud infrastructure and Kubernetes.',
        location: 'Pune, Maharashtra',
        employmentType: 'Hybrid',
        workplaceType: 'hybrid',
        experienceLevel: 'mid-level',
        requiredSkills: ['Docker', 'AWS'],
      },
    });
    assert(hybridJobRes.status === 201, 'Accepts Hybrid employment type (HTTP 201)');

    // 7d: Rejects invalid salary where max < min
    const invalidSalaryRes = await mockRequest(app, {
      method: 'POST',
      url: '/api/jobs',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        title: 'Invalid Salary Job',
        company: 'Delhi Tech',
        description: 'Should be rejected due to inverted salary range.',
        location: 'Gurugram, Haryana',
        employmentType: 'Full-time',
        salaryRange: { min: 50000, max: 20000, currency: 'INR', period: 'monthly' },
      },
    });
    assert(invalidSalaryRes.status === 400, 'Rejects invalid salary where max < min (HTTP 400)');

    // 7e: Location search matching Indian cities
    const blrSearchRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?location=Bengaluru',
    });
    assert(blrSearchRes.status === 200, 'Location search for Bengaluru returns HTTP 200');
    assert(
      blrSearchRes.body?.data?.some((j) => j.location.includes('Bengaluru')),
      'Returns matching job in Bengaluru'
    );

    // 7f: Salary range filter
    const salaryFilterRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?minSalary=2000000',
    });
    assert(salaryFilterRes.status === 200, 'Filter by minSalary returns HTTP 200');

    // 7g: Experience level filter
    const expFilterRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?experienceLevel=senior',
    });
    assert(expFilterRes.status === 200, 'Filter by experienceLevel returns HTTP 200');

    // 7h: Workplace type filter
    const wpFilterRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?workplaceType=remote',
    });
    assert(wpFilterRes.status === 200, 'Filter by workplaceType returns HTTP 200');

    // 7i: Normalized LPA minSalary filter (< 100 converts to LPA)
    const lpaFilterRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?minSalary=18',
    });
    assert(lpaFilterRes.status === 200, 'Filter by LPA minSalary returns HTTP 200');

    // 7j: Empty results for non-matching query
    const emptyRes = await mockRequest(app, {
      method: 'GET',
      url: '/api/jobs?search=nonexistenttermxyz999',
    });
    assert(emptyRes.status === 200, 'Non-matching search returns HTTP 200');
    assert(Array.isArray(emptyRes.body?.data) && emptyRes.body.data.length === 0, 'Returns empty array for non-matching search');
  } finally {
    // Restore original methods
    Job.find = origFind;
    Job.findById = origFindById;
    Job.countDocuments = origCountDocuments;
    Job.create = origCreate;
  }

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

runJobTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

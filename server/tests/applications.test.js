const http = require('http');
const path = require('path');
const mongoose = require('mongoose');

// Ensure module resolution points to server/node_modules
process.env.NODE_PATH = path.resolve(__dirname, '../node_modules');
require('module').Module._initPaths();

const { generateToken } = require('../src/utils/token');
const app = require('../src/app');
const { Application, Job, User } = require('../src/models');

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
 * Isolated In-Memory Storage Fixtures for Applications Testing
 */
const createInMemoryFixtures = () => {
  const recruiter1Id = new mongoose.Types.ObjectId();
  const recruiter2Id = new mongoose.Types.ObjectId();
  const candidate1Id = new mongoose.Types.ObjectId();
  const candidate2Id = new mongoose.Types.ObjectId();

  const publishedJobId = new mongoose.Types.ObjectId();
  const draftJobId = new mongoose.Types.ObjectId();
  const closedJobId = new mongoose.Types.ObjectId();

  const app1Id = new mongoose.Types.ObjectId();

  const jobsStore = [
    {
      _id: publishedJobId,
      recruiter: recruiter1Id,
      title: 'Senior React Engineer',
      company: 'TechCorp India',
      description: 'Building modern interfaces',
      location: 'Bengaluru, Karnataka',
      employmentType: 'Full-time',
      status: 'published',
      applicantCount: 2,
      save: async function () {
        return this;
      },
    },
    {
      _id: draftJobId,
      recruiter: recruiter1Id,
      title: 'Draft Node Engineer',
      company: 'TechCorp India',
      description: 'Backend role',
      location: 'Remote',
      employmentType: 'Full-time',
      status: 'draft',
      applicantCount: 0,
      save: async function () {
        return this;
      },
    },
    {
      _id: closedJobId,
      recruiter: recruiter2Id,
      title: 'Closed DevOps Lead',
      company: 'CloudWorks',
      description: 'Infrastructure role',
      location: 'Hyderabad, Telangana',
      employmentType: 'Full-time',
      status: 'closed',
      applicantCount: 10,
      save: async function () {
        return this;
      },
    },
  ];

  const applicationsStore = [
    {
      _id: app1Id,
      candidate: candidate1Id,
      job: publishedJobId,
      resume: {
        originalName: 'existing_candidate1_resume.pdf',
        storageKey: `resumes/${candidate1Id}/resume.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 10240,
        uploadedAt: new Date('2026-10-15'),
      },
      status: 'submitted',
      coverLetter: 'I am excited about this React role!',
      recruiterNotes: [],
      createdAt: new Date('2026-10-15'),
      updatedAt: new Date('2026-10-15'),
      save: async function () {
        return this;
      },
    },
  ];

  const usersStore = [
    {
      _id: candidate1Id,
      name: 'Pooja Verma',
      email: 'pooja.verma@careerpulse.test',
      role: 'candidate',
      resume: {
        originalName: 'pooja_profile_resume.pdf',
        storageKey: `resumes/${candidate1Id}/profile_resume.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 25000,
      },
    },
    {
      _id: candidate2Id,
      name: 'Rohan Mehta',
      email: 'rohan.mehta@careerpulse.test',
      role: 'candidate',
      resume: null,
    },
    {
      _id: recruiter1Id,
      name: 'Aditi Sharma',
      email: 'aditi.sharma@careerpulse.test',
      role: 'recruiter',
    },
    {
      _id: recruiter2Id,
      name: 'Vikram Singh',
      email: 'vikram.singh@careerpulse.test',
      role: 'recruiter',
    },
  ];

  return {
    jobsStore,
    applicationsStore,
    usersStore,
    recruiter1Id,
    recruiter2Id,
    candidate1Id,
    candidate2Id,
    publishedJobId,
    draftJobId,
    closedJobId,
    app1Id,
  };
};

/**
 * Applications API Test Suite
 */
const runApplicationTests = async () => {
  console.log('========================================================');
  console.log('[CareerPulse ATS] Running Candidate Applications & ATS Pipeline Tests');
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

  const fixtures = createInMemoryFixtures();

  const candidate1Token = generateToken({
    id: fixtures.candidate1Id.toString(),
    email: 'pooja.verma@careerpulse.test',
    role: 'candidate',
  });
  const candidate2Token = generateToken({
    id: fixtures.candidate2Id.toString(),
    email: 'rohan.mehta@careerpulse.test',
    role: 'candidate',
  });
  const recruiter1Token = generateToken({
    id: fixtures.recruiter1Id.toString(),
    email: 'aditi.sharma@careerpulse.test',
    role: 'recruiter',
  });
  const recruiter2Token = generateToken({
    id: fixtures.recruiter2Id.toString(),
    email: 'vikram.singh@careerpulse.test',
    role: 'recruiter',
  });

  // Backup Mongoose statics
  const origAppCreate = Application.create;
  const origAppFind = Application.find;
  const origAppFindById = Application.findById;
  const origAppFindOne = Application.findOne;
  const origAppCountDocuments = Application.countDocuments;

  const origJobFind = Job.find;
  const origJobFindById = Job.findById;
  const origJobFindByIdAndUpdate = Job.findByIdAndUpdate;
  const origUserFindById = User.findById;

  // Mock Job.find
  Job.find = function (filter) {
    let results = fixtures.jobsStore.filter((j) => {
      if (filter.recruiter && j.recruiter.toString() !== filter.recruiter.toString()) return false;
      return true;
    });
    const builder = {
      select: () => builder,
      sort: () => builder,
      skip: () => builder,
      limit: () => builder,
      then: (resolve) => resolve(results),
    };
    return builder;
  };

  // Mock Job.findById
  Job.findById = function (id) {
    const job = fixtures.jobsStore.find((j) => j._id.toString() === id?.toString());
    return Promise.resolve(job || null);
  };

  // Mock Job.findByIdAndUpdate
  Job.findByIdAndUpdate = function (id, update) {
    const job = fixtures.jobsStore.find((j) => j._id.toString() === id?.toString());
    if (job && update?.$inc?.applicantCount) {
      job.applicantCount += update.$inc.applicantCount;
    }
    return Promise.resolve(job || null);
  };

  // Mock User.findById
  User.findById = function (id) {
    const user = fixtures.usersStore.find((u) => u._id.toString() === id?.toString());
    return {
      select: () => Promise.resolve(user || null),
      then: (resolve) => resolve(user || null),
    };
  };

  // Mock Application.create
  Application.create = function (doc) {
    const newApp = {
      _id: new mongoose.Types.ObjectId(),
      ...doc,
      recruiterNotes: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      save: async function () {
        return this;
      },
    };
    fixtures.applicationsStore.push(newApp);
    return Promise.resolve(newApp);
  };

  // Mock Application.findOne
  Application.findOne = function (query) {
    const appDoc = fixtures.applicationsStore.find((a) => {
      let match = true;
      if (query.candidate && a.candidate.toString() !== query.candidate.toString()) match = false;
      if (query.job && a.job.toString() !== query.job.toString()) match = false;
      return match;
    });
    return Promise.resolve(appDoc || null);
  };

  // Mock Application.findById
  Application.findById = function (id) {
    const appDoc = fixtures.applicationsStore.find((a) => a._id.toString() === id?.toString());
    if (!appDoc) {
      return {
        populate: function () {
          return this;
        },
        then: (resolve) => resolve(null),
      };
    }

    const appCopy = { ...appDoc };
    const builder = {
      populate: function (path, select) {
        if (path === 'job') {
          appCopy.job = fixtures.jobsStore.find((j) => j._id.toString() === appDoc.job.toString());
        }
        if (path === 'candidate') {
          appCopy.candidate = fixtures.usersStore.find((u) => u._id.toString() === appDoc.candidate.toString());
        }
        return builder;
      },
      then: (resolve) => resolve(appCopy),
    };
    return builder;
  };

  // Mock Application.find
  Application.find = function (filter) {
    let results = fixtures.applicationsStore.filter((a) => {
      if (filter.candidate && a.candidate.toString() !== filter.candidate.toString()) return false;
      if (filter.job) {
        if (filter.job.$in) {
          const matched = filter.job.$in.some((id) => id.toString() === a.job.toString());
          if (!matched) return false;
        } else if (a.job.toString() !== filter.job.toString()) {
          return false;
        }
      }
      if (filter.status && a.status !== filter.status) return false;
      return true;
    });

    const builder = {
      select: () => builder,
      sort: () => builder,
      skip: () => builder,
      limit: () => builder,
      populate: (opts) => {
        results = results.map((a) => {
          const populated = { ...a };
          if (opts.path === 'job') {
            populated.job = fixtures.jobsStore.find((j) => j._id.toString() === a.job.toString());
          }
          if (opts.path === 'candidate') {
            populated.candidate = fixtures.usersStore.find((u) => u._id.toString() === a.candidate.toString());
          }
          return populated;
        });
        return builder;
      },
      then: (resolve) => resolve(results),
    };
    return builder;
  };

  // Mock Application.countDocuments
  Application.countDocuments = function (filter) {
    const count = fixtures.applicationsStore.filter((a) => {
      if (filter.candidate && a.candidate.toString() !== filter.candidate.toString()) return false;
      if (filter.job && a.job.toString() !== filter.job.toString()) return false;
      if (filter.status && a.status !== filter.status) return false;
      return true;
    }).length;
    return Promise.resolve(count);
  };

  try {
    // ----------------------------------------------------
    // Test Suite 1: Candidate Application Submission (Valid)
    // ----------------------------------------------------
    console.log('Test Suite 1: Candidate Application Submission');

    const validSubmission = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.publishedJobId}/apply`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
      body: {
        coverLetter: 'I have 4 years of hands-on experience in React.',
        originalName: 'rohan_mehta_cv.pdf',
        fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXr',
        mimeType: 'application/pdf',
        sizeBytes: 15420,
      },
    });

    assert(validSubmission.status === 201, 'Candidate applies successfully (HTTP 201)');
    assert(validSubmission.body?.success === true, 'Response indicates success: true');
    assert(validSubmission.body?.data?.status === 'submitted', 'Default status is submitted');
    assert(validSubmission.body?.data?.resume?.originalName === 'rohan_mehta_cv.pdf', 'Stores original resume name');

    // Verify applicantCount incremented
    const updatedJob = await Job.findById(fixtures.publishedJobId);
    assert(updatedJob.applicantCount === 3, 'Job applicantCount was atomically incremented (2 -> 3)');

    // Candidate 1 applies to another position using profile resume
    const profileResumeApply = await mockRequest(app, {
      method: 'POST',
      url: '/api/applications',
      headers: { Authorization: `Bearer ${candidate1Token}` },
      body: {
        jobId: fixtures.publishedJobId.toString(),
        useProfileResume: true,
        coverLetter: 'Applying with profile resume',
      },
    });
    // Wait: candidate 1 already applied to publishedJobId in fixtures!
    // So this should trigger duplicate protection!
    console.log('\nTest Suite 2: Duplicate-Application Protection');
    assert(profileResumeApply.status === 409, 'Submitting duplicate application returns HTTP 409 Conflict');
    assert(
      profileResumeApply.body?.message?.includes('already submitted an application'),
      'Conflict error informs user they have already applied'
    );

    // ----------------------------------------------------
    // Test Suite 3: Role & Authentication Enforcements
    // ----------------------------------------------------
    console.log('\nTest Suite 3: Role Authorization & Security');

    const unauthApply = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.publishedJobId}/apply`,
      body: {
        originalName: 'anon.pdf',
        fileData: 'base64test',
      },
    });
    assert(unauthApply.status === 401, 'Unauthenticated application rejected with HTTP 401');

    const recruiterApply = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.publishedJobId}/apply`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: {
        originalName: 'recruiter.pdf',
        fileData: 'base64test',
      },
    });
    assert(recruiterApply.status === 403, 'Recruiter role is forbidden from applying (HTTP 403)');

    // ----------------------------------------------------
    // Test Suite 4: Validation & Edge Cases
    // ----------------------------------------------------
    console.log('\nTest Suite 4: Application Validation & Edge Cases');

    const nonExistentJob = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${new mongoose.Types.ObjectId()}/apply`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
      body: { originalName: 'doc.pdf', fileData: 'abc' },
    });
    assert(nonExistentJob.status === 404, 'Applying to non-existent job returns HTTP 404');

    const draftJobApply = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.draftJobId}/apply`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
      body: { originalName: 'doc.pdf', fileData: 'abc' },
    });
    assert(draftJobApply.status === 400, 'Applying to draft job rejected (HTTP 400)');

    const closedJobApply = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.closedJobId}/apply`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
      body: { originalName: 'doc.pdf', fileData: 'abc' },
    });
    assert(closedJobApply.status === 400, 'Applying to closed job rejected (HTTP 400)');

    const invalidFileExt = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.publishedJobId}/apply`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
      body: {
        originalName: 'virus.exe',
        fileData: 'data:application/octet-stream;base64,TVqQAA',
      },
    });
    assert(invalidFileExt.status === 400, 'Rejects dangerous file format (.exe) with HTTP 400');

    const missingResume = await mockRequest(app, {
      method: 'POST',
      url: `/api/jobs/${fixtures.publishedJobId}/apply`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
      body: { coverLetter: 'Just a note' },
    });
    assert(missingResume.status === 400, 'Rejects application with missing resume (HTTP 400)');

    // ----------------------------------------------------
    // Test Suite 5: Candidate Applications List (GET /api/applications/mine)
    // ----------------------------------------------------
    console.log('\nTest Suite 5: Candidate Applications List (GET /api/applications/mine)');

    const candidate1Apps = await mockRequest(app, {
      method: 'GET',
      url: '/api/applications/mine',
      headers: { Authorization: `Bearer ${candidate1Token}` },
    });
    assert(candidate1Apps.status === 200, 'Candidate retrieves own applications successfully (HTTP 200)');
    assert(Array.isArray(candidate1Apps.body?.data), 'Returns data array of applications');
    assert(candidate1Apps.body?.data?.length === 1, 'Contains Candidate 1 submission');
    assert(candidate1Apps.body?.data[0]?.job?.title === 'Senior React Engineer', 'Populates job title');

    const recruiterMineForbidden = await mockRequest(app, {
      method: 'GET',
      url: '/api/applications/mine',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
    });
    assert(recruiterMineForbidden.status === 403, 'Recruiter cannot access candidate /mine route (HTTP 403)');

    // ----------------------------------------------------
    // Test Suite 6: Recruiter Pipeline & IDOR Protection
    // ----------------------------------------------------
    console.log('\nTest Suite 6: Recruiter Applicant Pipeline & IDOR Protection');

    const owningRecruiterView = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${fixtures.publishedJobId}/applications`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
    });
    assert(owningRecruiterView.status === 200, 'Owning recruiter views job applicants (HTTP 200)');
    assert(owningRecruiterView.body?.data?.length >= 1, 'Returns applicant list');

    // Recruiter views all applications across all postings
    const recruiterAllApps = await mockRequest(app, {
      method: 'GET',
      url: '/api/applications/recruiter',
      headers: { Authorization: `Bearer ${recruiter1Token}` },
    });
    assert(recruiterAllApps.status === 200, 'Recruiter fetches all applicants across all jobs (HTTP 200)');
    assert(Array.isArray(recruiterAllApps.body?.data), 'Returns data array across recruiter postings');

    const nonOwningRecruiterView = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${fixtures.publishedJobId}/applications`,
      headers: { Authorization: `Bearer ${recruiter2Token}` },
    });
    assert(nonOwningRecruiterView.status === 403, 'Non-owning recruiter forbidden (IDOR prevented, HTTP 403)');

    const candidateViewPipeline = await mockRequest(app, {
      method: 'GET',
      url: `/api/jobs/${fixtures.publishedJobId}/applications`,
      headers: { Authorization: `Bearer ${candidate1Token}` },
    });
    assert(candidateViewPipeline.status === 403, 'Candidate forbidden from recruiter pipeline (HTTP 403)');

    // ----------------------------------------------------
    // Test Suite 7: Application Status Updates & Recruiter Notes
    // ----------------------------------------------------
    console.log('\nTest Suite 7: Application Status Updates & Recruiter Notes');

    const updateStatus = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/applications/${fixtures.app1Id}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'shortlisted' },
    });
    assert(updateStatus.status === 200, 'Owning recruiter updates application status to shortlisted (HTTP 200)');
    assert(updateStatus.body?.data?.status === 'shortlisted', 'Updated status is reflected');

    const updateStatusInterview = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/applications/${fixtures.app1Id}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'interview_scheduled' },
    });
    assert(updateStatusInterview.status === 200, 'Owning recruiter updates status to interview_scheduled (HTTP 200)');

    const updateStatusAccepted = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/applications/${fixtures.app1Id}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'accepted' },
    });
    assert(updateStatusAccepted.status === 200, 'Owning recruiter updates status to accepted (HTTP 200)');

    const invalidStatus = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/applications/${fixtures.app1Id}/status`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { status: 'flying_to_moon' },
    });
    assert(invalidStatus.status === 400, 'Rejects invalid status (HTTP 400)');

    const nonOwningStatusUpdate = await mockRequest(app, {
      method: 'PATCH',
      url: `/api/applications/${fixtures.app1Id}/status`,
      headers: { Authorization: `Bearer ${recruiter2Token}` },
      body: { status: 'rejected' },
    });
    assert(nonOwningStatusUpdate.status === 403, 'Non-owning recruiter cannot change status (HTTP 403)');

    const addNote = await mockRequest(app, {
      method: 'POST',
      url: `/api/applications/${fixtures.app1Id}/notes`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { note: 'Strong portfolio in React and TypeScript. Schedule round 1 interview.' },
    });
    assert(addNote.status === 201, 'Owning recruiter adds evaluation note (HTTP 201)');
    assert(addNote.body?.data?.length === 1, 'Note added to recruiterNotes array');

    const rejectOversizedNote = await mockRequest(app, {
      method: 'POST',
      url: `/api/applications/${fixtures.app1Id}/notes`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { note: 'A'.repeat(3001) },
    });
    assert(rejectOversizedNote.status === 400, 'Rejects recruiter note exceeding 3000 chars (HTTP 400)');

    const rejectBlankNote = await mockRequest(app, {
      method: 'POST',
      url: `/api/applications/${fixtures.app1Id}/notes`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
      body: { note: '   ' },
    });
    assert(rejectBlankNote.status === 400, 'Rejects empty whitespace note (HTTP 400)');

    // Confidentiality Check: Candidate must NEVER receive private recruiterNotes
    const candidateGetApp = await mockRequest(app, {
      method: 'GET',
      url: `/api/applications/${fixtures.app1Id}`,
      headers: { Authorization: `Bearer ${candidate1Token}` },
    });
    assert(candidateGetApp.status === 200, 'Candidate can view own application details (HTTP 200)');
    assert(
      candidateGetApp.body?.data?.recruiterNotes === undefined,
      'Confidentiality: Private recruiterNotes are never exposed to applicant candidate'
    );

    const recruiterGetApp = await mockRequest(app, {
      method: 'GET',
      url: `/api/applications/${fixtures.app1Id}`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
    });
    assert(recruiterGetApp.status === 200, 'Owning recruiter views full application with notes (HTTP 200)');
    assert(
      Array.isArray(recruiterGetApp.body?.data?.recruiterNotes),
      'Recruiter receives recruiterNotes evaluation history'
    );

    // ----------------------------------------------------
    // Test Suite 8: Secure Resume Streaming
    // ----------------------------------------------------
    console.log('\nTest Suite 8: Secure Resume Streaming & Authorization');

    const candidateDownload = await mockRequest(app, {
      method: 'GET',
      url: `/api/applications/${fixtures.app1Id}/resume`,
      headers: { Authorization: `Bearer ${candidate1Token}` },
    });
    assert(candidateDownload.status === 200, 'Candidate can download their own application resume (HTTP 200)');

    const owningRecruiterDownload = await mockRequest(app, {
      method: 'GET',
      url: `/api/applications/${fixtures.app1Id}/resume`,
      headers: { Authorization: `Bearer ${recruiter1Token}` },
    });
    assert(owningRecruiterDownload.status === 200, 'Owning recruiter can download applicant resume (HTTP 200)');

    const nonOwningRecruiterDownload = await mockRequest(app, {
      method: 'GET',
      url: `/api/applications/${fixtures.app1Id}/resume`,
      headers: { Authorization: `Bearer ${recruiter2Token}` },
    });
    assert(nonOwningRecruiterDownload.status === 403, 'Non-owning recruiter forbidden from downloading resume (HTTP 403)');

    const otherCandidateDownload = await mockRequest(app, {
      method: 'GET',
      url: `/api/applications/${fixtures.app1Id}/resume`,
      headers: { Authorization: `Bearer ${candidate2Token}` },
    });
    assert(otherCandidateDownload.status === 403, 'Unrelated candidate forbidden from accessing resume (HTTP 403)');

    console.log('\n========================================================');
    console.log(`[Applications Tests Summary] Passed: ${passed} | Failed: ${failed}`);
    console.log('========================================================\n');

    if (failed > 0) process.exit(1);
  } finally {
    // Restore original statics
    Application.create = origAppCreate;
    Application.find = origAppFind;
    Application.findById = origAppFindById;
    Application.findOne = origAppFindOne;
    Application.countDocuments = origAppCountDocuments;

    Job.find = origJobFind;
    Job.findById = origJobFindById;
    Job.findByIdAndUpdate = origJobFindByIdAndUpdate;
    User.findById = origUserFindById;
  }
};

runApplicationTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});

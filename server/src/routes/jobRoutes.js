const express = require('express');
const {
  createJob,
  getJobs,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
} = require('../controllers/jobController');
const {
  applyToJob,
  getJobApplications,
} = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Public Routes
 */
// GET /api/jobs — list published jobs with search, filters, pagination
router.get('/', getJobs);

/**
 * Protected Recruiter Routes
 */
// POST /api/jobs — create a job (recruiter-only)
router.post('/', authenticate, authorize('recruiter'), createJob);

// GET /api/jobs/mine — list all own jobs (recruiter-only; declared before /:id)
router.get('/mine', authenticate, authorize('recruiter'), getMyJobs);

/**
 * Parameterized Routes
 */
// GET /api/jobs/:id — retrieve a published job by ID (public)
router.get('/:id', getJobById);

// PATCH /api/jobs/:id — update job details (owning recruiter only)
router.patch('/:id', authenticate, authorize('recruiter'), updateJob);

// PATCH /api/jobs/:id/status — update status to draft, published, or closed (owning recruiter only)
router.patch('/:id/status', authenticate, authorize('recruiter'), updateJobStatus);

// POST /api/jobs/:id/apply — submit candidate application for this job
router.post('/:id/apply', authenticate, authorize('candidate'), applyToJob);

// GET /api/jobs/:id/applications — get all applicants for this job (owning recruiter only)
router.get('/:id/applications', authenticate, authorize('recruiter'), getJobApplications);

module.exports = router;

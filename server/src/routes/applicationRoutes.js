const express = require('express');
const {
  applyToJob,
  getMyApplications,
  getJobApplications,
  getApplicationById,
  updateApplicationStatus,
  addRecruiterNote,
  downloadApplicantResume,
} = require('../controllers/applicationController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * Candidate Application Routes
 */
// POST /api/applications — submit job application (Candidate only)
router.post('/', authenticate, authorize('candidate'), applyToJob);

// GET /api/applications/mine — get all applications submitted by candidate
router.get('/mine', authenticate, authorize('candidate'), getMyApplications);

/**
 * Recruiter Applicant Pipeline Routes
 */
// GET /api/applications/recruiter — get all applications for authenticated recruiter across all jobs
router.get('/recruiter', authenticate, authorize('recruiter'), getJobApplications);

// GET /api/applications/job/:jobId — get applications for a specific job (Owning recruiter only)
router.get('/job/:jobId', authenticate, authorize('recruiter'), getJobApplications);

/**
 * Parameterized Application Routes
 */
// GET /api/applications/:id — get specific application details (Candidate or Owning Recruiter)
router.get('/:id', authenticate, getApplicationById);

// PATCH /api/applications/:id/status — update review status (Owning Recruiter only)
router.patch('/:id/status', authenticate, authorize('recruiter'), updateApplicationStatus);

// POST /api/applications/:id/notes — add private recruiter note (Owning Recruiter only)
router.post('/:id/notes', authenticate, authorize('recruiter'), addRecruiterNote);

// GET /api/applications/:id/resume — securely stream/download applicant resume
router.get('/:id/resume', authenticate, downloadApplicantResume);

module.exports = router;

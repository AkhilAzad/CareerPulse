const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { Application, Job, User } = require('../models');

const RESUME_STORAGE_DIR = path.resolve(__dirname, '../../storage/resumes');

const ensureResumeDirectory = (subDir = '') => {
  const targetDir = subDir ? path.join(RESUME_STORAGE_DIR, subDir) : RESUME_STORAGE_DIR;
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

// Allowed application status values matching schema enum
const ALLOWED_APPLICATION_STATUSES = [
  'submitted',
  'under_review',
  'shortlisted',
  'interview_scheduled',
  'rejected',
  'accepted',
];

/**
 * @route   POST /api/jobs/:id/apply  OR  POST /api/applications
 * @desc    Submit a job application as an authenticated candidate
 * @access  Private (Candidate only)
 */
const applyToJob = async (req, res, next) => {
  try {
    const jobId = req.params.id || req.body.jobId || req.body.job;

    if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A valid job ID is required.',
      });
    }

    // Role check: Only candidates may apply
    if (req.user.role !== 'candidate') {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. Only candidate accounts are permitted to apply for jobs.',
      });
    }

    // 1. Verify job exists and is open for applications
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Job not found.',
      });
    }

    if (job.status !== 'published') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'This position is not currently accepting applications.',
      });
    }

    // 2. Resolve and validate resume input before checking duplicate state
    const {
      useProfileResume,
      resume: inputResume,
      coverLetter,
      fileData,
      originalName,
      mimeType,
      sizeBytes,
    } = req.body || {};

    if (!useProfileResume && !fileData && (!inputResume || !inputResume.storageKey)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A resume is required to apply for this position.',
      });
    }

    if (fileData && typeof fileData === 'string') {
      if (!originalName || typeof originalName !== 'string') {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Original resume filename is required.',
        });
      }

      const ext = path.extname(originalName).toLowerCase();
      const allowedExts = ['.pdf', '.doc', '.docx'];
      if (!allowedExts.includes(ext)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Unsupported resume format. Allowed formats: PDF, DOC, DOCX.',
        });
      }

      const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
      const parsedSize = Number(sizeBytes) || 0;
      if (parsedSize > MAX_SIZE) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Resume file size exceeds the 5 MB limit.',
        });
      }
    }

    // Validate cover letter length if provided
    let sanitizedCoverLetter = undefined;
    if (coverLetter !== undefined && coverLetter !== null) {
      if (typeof coverLetter !== 'string') {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Cover letter must be a string.',
        });
      }
      if (coverLetter.length > 5000) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Cover letter cannot exceed 5000 characters.',
        });
      }
      sanitizedCoverLetter = coverLetter.trim();
    }

    // 3. Prevent duplicate application
    const existingApp = await Application.findOne({
      candidate: req.user.id,
      job: job._id,
    });

    if (existingApp) {
      return res.status(409).json({
        success: false,
        status: 409,
        message: 'You have already submitted an application for this position.',
        applicationId: existingApp._id,
      });
    }

    // 4. Finalize resume persistence
    let finalResume = null;

    if (useProfileResume) {
      const candidateUser = await User.findById(req.user.id);
      if (!candidateUser?.resume?.storageKey) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'No resume found on candidate profile. Please upload a resume file.',
        });
      }
      finalResume = {
        originalName: candidateUser.resume.originalName,
        storageKey: candidateUser.resume.storageKey,
        mimeType: candidateUser.resume.mimeType || 'application/pdf',
        sizeBytes: candidateUser.resume.sizeBytes,
        uploadedAt: new Date(),
      };
    } else if (fileData && typeof fileData === 'string') {
      const ext = path.extname(originalName).toLowerCase();
      const sanitizedBase = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueFileName = `${Date.now()}-${sanitizedBase}`;
      const safeKey = `resumes/${req.user.id}/${uniqueFileName}`;

      const base64Content = fileData.includes(';base64,')
        ? fileData.split(';base64,').pop()
        : fileData;
      const buffer = Buffer.from(base64Content, 'base64');

      const userDir = ensureResumeDirectory(req.user.id.toString());
      const filePath = path.join(userDir, uniqueFileName);
      fs.writeFileSync(filePath, buffer);

      finalResume = {
        originalName: originalName.trim(),
        storageKey: safeKey,
        mimeType: mimeType || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'),
        sizeBytes: buffer.length,
        uploadedAt: new Date(),
      };
    } else if (inputResume && typeof inputResume === 'object' && inputResume.storageKey) {
      finalResume = {
        originalName: inputResume.originalName || 'resume.pdf',
        storageKey: inputResume.storageKey,
        mimeType: inputResume.mimeType || 'application/pdf',
        sizeBytes: inputResume.sizeBytes || 0,
        uploadedAt: new Date(),
      };
    }

    // 5. Create Application document
    const application = await Application.create({
      candidate: req.user.id,
      job: job._id,
      resume: finalResume,
      coverLetter: sanitizedCoverLetter,
      status: 'submitted',
    });

    // 6. Increment applicantCount on Job document
    await Job.findByIdAndUpdate(job._id, { $inc: { applicantCount: 1 } });

    return res.status(201).json({
      success: true,
      status: 201,
      message: 'Application submitted successfully.',
      data: application,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 409,
        message: 'You have already submitted an application for this position.',
      });
    }
    return next(error);
  }
};

/**
 * @route   GET /api/applications/mine
 * @desc    Get all applications submitted by authenticated candidate
 * @access  Private (Candidate only)
 */
const getMyApplications = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { candidate: req.user.id };

    if (req.query.status && ALLOWED_APPLICATION_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .select('-recruiterNotes')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'job',
          select: 'title company location employmentType workplaceType salaryRange status recruiter createdAt',
        }),
      Application.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      count: applications.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      data: applications,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/jobs/:id/applications  OR  GET /api/applications/job/:id
 * @desc    Get candidate applications for a specific job or all posted jobs (Owning recruiter only)
 * @access  Private (Owning Recruiter)
 */
const getJobApplications = async (req, res, next) => {
  try {
    const rawJobId = req.params.id || req.params.jobId;
    const jobId = rawJobId ? rawJobId.trim() : '';

    let jobFilter = {};
    let targetJob = null;

    if (jobId === 'all' || !jobId) {
      // Find all jobs owned by authenticated recruiter
      const recruiterJobs = await Job.find({ recruiter: req.user.id }).select('_id');
      const recruiterJobIds = recruiterJobs.map((j) => j._id);
      jobFilter = { job: { $in: recruiterJobIds } };
    } else {
      if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Invalid job ID format.',
        });
      }

      const job = await Job.findById(jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          status: 404,
          message: 'Job not found.',
        });
      }

      // IDOR Protection: Recruiter must own this job
      if (job.recruiter.toString() !== req.user.id.toString()) {
        return res.status(403).json({
          success: false,
          status: 403,
          message: 'Forbidden. You do not have permission to view applicants for this job.',
        });
      }

      targetJob = job;
      jobFilter = { job: job._id };
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { ...jobFilter };
    if (req.query.status && ALLOWED_APPLICATION_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [applications, total] = await Promise.all([
      Application.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({
          path: 'candidate',
          select: 'name email profile skills education experience createdAt',
        })
        .populate({
          path: 'job',
          select: 'title company location status applicantCount',
        }),
      Application.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      count: applications.length,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
      ...(targetJob && {
        job: {
          _id: targetJob._id,
          title: targetJob.title,
          company: targetJob.company,
          applicantCount: targetJob.applicantCount,
          status: targetJob.status,
        },
      }),
      data: applications,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/applications/:id
 * @desc    Get detailed application record (Candidate who submitted or Owning Recruiter)
 * @access  Private (Candidate or Owning Recruiter)
 */
const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid application ID format.',
      });
    }

    const application = await Application.findById(id)
      .populate('job', 'title company location recruiter status salaryRange employmentType')
      .populate('candidate', 'name email profile skills education experience');

    if (!application) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Application not found.',
      });
    }

    // Access authorization: Must be the applicant candidate OR the owning recruiter
    const isApplicant = application.candidate?._id?.toString() === req.user.id.toString();
    const isOwningRecruiter =
      application.job?.recruiter &&
      application.job.recruiter.toString() === req.user.id.toString();

    if (!isApplicant && !isOwningRecruiter && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. You do not have permission to view this application.',
      });
    }

    const appObj = application.toObject ? application.toObject() : { ...application };
    // Confidentiality Protection: Private recruiter notes must never be exposed to candidate applicants
    if (!isOwningRecruiter && req.user.role !== 'admin') {
      delete appObj.recruiterNotes;
    }

    return res.status(200).json({
      success: true,
      status: 200,
      data: appObj,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   PATCH /api/applications/:id/status
 * @desc    Update applicant review status in pipeline (Owning Recruiter only)
 * @access  Private (Owning Recruiter)
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid application ID format.',
      });
    }

    if (!status || !ALLOWED_APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Invalid status. Allowed statuses are: ${ALLOWED_APPLICATION_STATUSES.join(', ')}.`,
      });
    }

    const application = await Application.findById(id).populate('job', 'recruiter');
    if (!application) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Application not found.',
      });
    }

    // IDOR Protection: Only the owning recruiter can change application status
    if (
      !application.job ||
      application.job.recruiter.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. You do not have permission to modify this application status.',
      });
    }

    application.status = status;
    await application.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: `Application status updated to ${status}.`,
      data: application,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   POST /api/applications/:id/notes
 * @desc    Add private recruiter evaluation note (Owning Recruiter only)
 * @access  Private (Owning Recruiter)
 */
const addRecruiterNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { note } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid application ID format.',
      });
    }

    if (!note || typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Note text is required and cannot be empty.',
      });
    }

    if (note.trim().length > 3000) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Note text cannot exceed 3000 characters.',
      });
    }

    const application = await Application.findById(id).populate('job', 'recruiter');
    if (!application) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Application not found.',
      });
    }

    // IDOR Protection
    if (
      !application.job ||
      application.job.recruiter.toString() !== req.user.id.toString()
    ) {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. You do not have permission to add notes to this application.',
      });
    }

    application.recruiterNotes.push({
      author: req.user.id,
      note: note.trim(),
      createdAt: new Date(),
    });

    await application.save();

    return res.status(201).json({
      success: true,
      status: 201,
      message: 'Recruiter note added successfully.',
      data: application.recruiterNotes,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/applications/:id/resume
 * @desc    Securely download applicant resume (Applicant or Owning Recruiter)
 * @access  Private (Applicant or Owning Recruiter)
 */
const downloadApplicantResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid application ID format.',
      });
    }

    const application = await Application.findById(id)
      .populate('job', 'recruiter')
      .populate('candidate', 'name email');

    if (!application) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Application not found.',
      });
    }

    // Permissions check: Applicant OR Owning Recruiter
    const isApplicant = application.candidate._id.toString() === req.user.id.toString();
    const isOwningRecruiter =
      application.job?.recruiter &&
      application.job.recruiter.toString() === req.user.id.toString();

    if (!isApplicant && !isOwningRecruiter && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. You do not have permission to access this resume.',
      });
    }

    if (!application.resume || !application.resume.storageKey) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'No resume attached to this application.',
      });
    }

    const filePath = path.resolve(__dirname, '../../storage', application.resume.storageKey);

    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', application.resume.mimeType || 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(application.resume.originalName)}"`
      );
      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(res);
    }

    // Fallback structured text stream if only metadata is available
    const fallbackText = [
      `CareerPulse ATS - Candidate Application Resume Reference`,
      `======================================================`,
      `Candidate: ${application.candidate?.name || 'Applicant'}`,
      `Email: ${application.candidate?.email || 'N/A'}`,
      `Original File: ${application.resume.originalName}`,
      `Uploaded At: ${application.resume.uploadedAt}`,
      `Status: ${application.status}`,
    ].join('\n');

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(application.resume.originalName + '.txt')}"`
    );
    return res.status(200).send(fallbackText);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  applyToJob,
  getMyApplications,
  getJobApplications,
  getApplicationById,
  updateApplicationStatus,
  addRecruiterNote,
  downloadApplicantResume,
};

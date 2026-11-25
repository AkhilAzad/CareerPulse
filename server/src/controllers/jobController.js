const mongoose = require('mongoose');
const { Job } = require('../models');

// Allowed employment types matching schema enum
const ALLOWED_EMPLOYMENT_TYPES = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Remote',
  'Hybrid',
  'On-site',
];

// Allowed workplace types
const ALLOWED_WORKPLACE_TYPES = ['on-site', 'hybrid', 'remote'];

// Allowed experience levels
const ALLOWED_EXPERIENCE_LEVELS = [
  'fresher',
  'internship',
  'entry-level',
  'mid-level',
  'senior',
  'lead',
];

// Allowed job statuses matching schema enum
const ALLOWED_STATUSES = ['draft', 'published', 'closed'];

/**
 * Escape special characters in user input for safe RegExp queries
 */
const escapeRegex = (string) => {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @route   POST /api/jobs
 * @desc    Create a new job listing (Recruiter only)
 * @access  Private (Recruiter)
 */
const createJob = async (req, res, next) => {
  try {
    const {
      title,
      company,
      companyLogo,
      logoBg,
      description,
      location,
      employmentType,
      workplaceType,
      experienceLevel,
      category,
      requiredSkills,
      salaryRange,
      department,
      featured,
      urgent,
      status,
    } = req.body || {};

    // 1. Validate required fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Job title is required and must be a non-empty string.',
      });
    }

    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Company name is required and must be a non-empty string.',
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Job description is required and must be a non-empty string.',
      });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Job location is required and must be a non-empty string.',
      });
    }

    if (!employmentType || !ALLOWED_EMPLOYMENT_TYPES.includes(employmentType)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Valid employment type is required. Allowed types: ${ALLOWED_EMPLOYMENT_TYPES.join(', ')}.`,
      });
    }

    // 2. Validate initial status if provided
    let initialStatus = 'published';
    if (status) {
      if (!['draft', 'published'].includes(status)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Initial job status on creation can only be draft or published.',
        });
      }
      initialStatus = status;
    }

    // 3. Format required skills array
    let skillsArray = [];
    if (Array.isArray(requiredSkills)) {
      skillsArray = requiredSkills.map((s) => String(s).trim()).filter(Boolean);
    } else if (typeof requiredSkills === 'string') {
      skillsArray = requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    // 4. Validate and sanitize salary range
    let sanitizedSalary = undefined;
    if (salaryRange && typeof salaryRange === 'object') {
      const min = salaryRange.min != null && salaryRange.min !== '' ? Number(salaryRange.min) : undefined;
      const max = salaryRange.max != null && salaryRange.max !== '' ? Number(salaryRange.max) : undefined;
      if (min != null && (isNaN(min) || min < 0)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Minimum salary cannot be negative.',
        });
      }
      if (max != null && (isNaN(max) || max < 0)) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Maximum salary cannot be negative.',
        });
      }
      if (min != null && max != null && max < min) {
        return res.status(400).json({
          success: false,
          status: 400,
          message: 'Maximum salary must be greater than or equal to minimum salary.',
        });
      }
      const allowedPeriods = ['yearly', 'monthly', 'hourly', 'stipend'];
      const period = allowedPeriods.includes(salaryRange.period) ? salaryRange.period : 'yearly';
      const currency = salaryRange.currency ? String(salaryRange.currency).trim().toUpperCase() : 'INR';
      sanitizedSalary = { min, max, currency, period };
    }

    // 5. Validate workplaceType and experienceLevel
    const validWorkplace = ALLOWED_WORKPLACE_TYPES.includes(workplaceType) ? workplaceType : 'on-site';
    const validExperience = ALLOWED_EXPERIENCE_LEVELS.includes(experienceLevel) ? experienceLevel : 'entry-level';

    // 6. Create Job document with recruiter ownership strictly from JWT
    const job = await Job.create({
      recruiter: req.user.id,
      title: title.trim(),
      company: company.trim(),
      companyLogo: typeof companyLogo === 'string' ? companyLogo.trim() : undefined,
      logoBg: typeof logoBg === 'string' ? logoBg.trim() : undefined,
      description: description.trim(),
      location: location.trim(),
      employmentType,
      workplaceType: validWorkplace,
      experienceLevel: validExperience,
      category: typeof category === 'string' ? category.trim() : undefined,
      requiredSkills: skillsArray,
      salaryRange: sanitizedSalary,
      department: typeof department === 'string' ? department.trim() : undefined,
      featured: Boolean(featured),
      urgent: Boolean(urgent),
      status: initialStatus,
    });

    return res.status(201).json({
      success: true,
      status: 201,
      message: 'Job listing created successfully.',
      data: job,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/jobs
 * @desc    List published jobs with pagination, keyword search, and filters
 * @access  Public
 */
const getJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    // Public search strictly exposes published jobs only
    const filter = { status: 'published' };

    // Keyword search across title, company, skills, and location
    const search = req.query.search || req.query.q || req.query.keyword;
    if (search && typeof search === 'string' && search.trim()) {
      const escaped = escapeRegex(search.trim());
      filter.$or = [
        { title: { $regex: escaped, $options: 'i' } },
        { company: { $regex: escaped, $options: 'i' } },
        { requiredSkills: { $regex: escaped, $options: 'i' } },
        { location: { $regex: escaped, $options: 'i' } },
      ];
    }

    // Filter by location with Indian tech hub alias support
    if (req.query.location && typeof req.query.location === 'string' && req.query.location.trim()) {
      const loc = req.query.location.trim();
      const lowerLoc = loc.toLowerCase();
      let pattern = escapeRegex(loc);

      if (lowerLoc.includes('bengaluru') || lowerLoc.includes('bangalore')) {
        pattern = 'bengaluru|bangalore';
      } else if (lowerLoc.includes('delhi') || lowerLoc.includes('ncr') || lowerLoc.includes('gurugram') || lowerLoc.includes('noida')) {
        pattern = 'delhi|ncr|gurugram|gurgaon|noida';
      } else if (lowerLoc.includes('mumbai') || lowerLoc.includes('navi mumbai')) {
        pattern = 'mumbai|thane';
      } else if (lowerLoc.includes('chandigarh')) {
        pattern = 'chandigarh|mohali|panchkula';
      } else if (lowerLoc.includes('hyderabad')) {
        pattern = 'hyderabad|secunderabad';
      } else if (lowerLoc.includes('remote')) {
        pattern = 'remote';
      } else if (loc.includes(',')) {
        const cityPart = loc.split(',')[0].trim();
        if (cityPart) pattern = escapeRegex(cityPart);
      }

      filter.location = { $regex: pattern, $options: 'i' };
    }

    // Filter by employmentType
    if (
      req.query.employmentType &&
      typeof req.query.employmentType === 'string' &&
      ALLOWED_EMPLOYMENT_TYPES.includes(req.query.employmentType.trim())
    ) {
      filter.employmentType = req.query.employmentType.trim();
    }

    // Filter by category (supports id or display name matching)
    if (req.query.category && typeof req.query.category === 'string' && req.query.category.trim()) {
      const cat = req.query.category.trim();
      filter.category = { $regex: new RegExp(`^${escapeRegex(cat)}`, 'i') };
    }

    // Filter by skills (comma-separated or single)
    const skillsParam = req.query.skills || req.query.skill;
    if (skillsParam && typeof skillsParam === 'string' && skillsParam.trim()) {
      const skills = skillsParam.split(',').map((s) => s.trim()).filter(Boolean);
      if (skills.length > 0) {
        filter.requiredSkills = {
          $in: skills.map((s) => new RegExp(`^${escapeRegex(s)}$`, 'i')),
        };
      }
    }

    // Filter by featured status
    if (req.query.featured === 'true') {
      filter.featured = true;
    }

    // Filter by workplaceType
    if (
      req.query.workplaceType &&
      typeof req.query.workplaceType === 'string' &&
      ALLOWED_WORKPLACE_TYPES.includes(req.query.workplaceType.trim())
    ) {
      filter.workplaceType = req.query.workplaceType.trim();
    }

    // Filter by experienceLevel
    if (
      req.query.experienceLevel &&
      typeof req.query.experienceLevel === 'string' &&
      ALLOWED_EXPERIENCE_LEVELS.includes(req.query.experienceLevel.trim())
    ) {
      filter.experienceLevel = req.query.experienceLevel.trim();
    }

    // Filter by salary range (normalizes LPA e.g. 6 -> 600,000 INR)
    if (req.query.minSalary != null && !isNaN(Number(req.query.minSalary))) {
      let minVal = Number(req.query.minSalary);
      if (minVal > 0 && minVal < 100) minVal = minVal * 100000;
      filter['salaryRange.max'] = { $gte: minVal };
    }
    if (req.query.maxSalary != null && !isNaN(Number(req.query.maxSalary))) {
      let maxVal = Number(req.query.maxSalary);
      if (maxVal > 0 && maxVal < 100) maxVal = maxVal * 100000;
      filter['salaryRange.min'] = { $lte: maxVal };
    }

    const sortOrder = req.query.sort === 'oldest' ? 'createdAt' : '-createdAt';

    const [total, jobs] = await Promise.all([
      Job.countDocuments(filter),
      Job.find(filter)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .populate(
          'recruiter',
          'name email company profile.company profile.companyWebsite profile.industry profile.companyLogo profile.headquarters profile.verificationStatus'
        )
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      count: jobs.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
      data: jobs,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/jobs/mine
 * @desc    List all jobs owned by the authenticated recruiter (all statuses)
 * @access  Private (Recruiter)
 */
const getMyJobs = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { recruiter: req.user.id };

    // Optional status filter
    if (req.query.status && ALLOWED_STATUSES.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const [total, jobs] = await Promise.all([
      Job.countDocuments(filter),
      Job.find(filter)
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      status: 200,
      count: jobs.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      limit,
      data: jobs,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/jobs/:id
 * @desc    Retrieve a published job by ID
 * @access  Public
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid job ID format.',
      });
    }

    const job = await Job.findById(id).populate(
      'recruiter',
      'name email company profile.company profile.companyWebsite profile.industry profile.companyLogo profile.headquarters profile.companyDescription profile.verificationStatus'
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Job not found.',
      });
    }

    // Public endpoint strictly returns published jobs
    if (job.status !== 'published') {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Job not found or no longer available.',
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      data: job,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   PATCH /api/jobs/:id
 * @desc    Update a job listing (Owning Recruiter only)
 * @access  Private (Owning Recruiter)
 */
const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid job ID format.',
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Job not found.',
      });
    }

    // Prevent IDOR: Check that the authenticated recruiter owns this job
    if (job.recruiter.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. You do not have permission to modify this job listing.',
      });
    }

    // Whitelist updatable fields (protected fields like recruiter, applicantCount, _id are ignored)
    const allowedFields = [
      'title',
      'company',
      'companyLogo',
      'logoBg',
      'description',
      'location',
      'employmentType',
      'workplaceType',
      'experienceLevel',
      'category',
      'requiredSkills',
      'salaryRange',
      'department',
      'featured',
      'urgent',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'requiredSkills') {
          if (Array.isArray(req.body[field])) {
            job[field] = req.body[field].map((s) => String(s).trim()).filter(Boolean);
          } else if (typeof req.body[field] === 'string') {
            job[field] = req.body[field].split(',').map((s) => s.trim()).filter(Boolean);
          }
        } else if (field === 'employmentType') {
          if (ALLOWED_EMPLOYMENT_TYPES.includes(req.body[field])) {
            job[field] = req.body[field];
          }
        } else if (field === 'status') {
          if (ALLOWED_STATUSES.includes(req.body[field])) {
            job[field] = req.body[field];
          }
        } else {
          job[field] = req.body[field];
        }
      }
    });

    await job.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Job listing updated successfully.',
      data: job,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Update a job's publication status: draft, published, or closed (Owning Recruiter only)
 * @access  Private (Owning Recruiter)
 */
const updateJobStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid job ID format.',
      });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Invalid status. Allowed statuses are: ${ALLOWED_STATUSES.join(', ')}.`,
      });
    }

    const job = await Job.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'Job not found.',
      });
    }

    // Prevent IDOR: Check that the authenticated recruiter owns this job
    if (job.recruiter.toString() !== req.user.id.toString()) {
      return res.status(403).json({
        success: false,
        status: 403,
        message: 'Forbidden. You do not have permission to modify this job status.',
      });
    }

    job.status = status;
    await job.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: `Job status updated to ${status}.`,
      data: job,
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createJob,
  getJobs,
  getMyJobs,
  getJobById,
  updateJob,
  updateJobStatus,
};

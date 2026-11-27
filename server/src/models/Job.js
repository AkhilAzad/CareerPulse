const mongoose = require('mongoose');

const salaryRangeSchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative'],
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative'],
      validate: {
        validator: function (val) {
          if (this.min != null && val != null) {
            return val >= this.min;
          }
          
          return true;
        },
        message: 'Maximum salary must be greater than or equal to minimum salary',
      },
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
      trim: true,
    },
    period: {
      type: String,
      enum: {
        values: ['hourly', 'monthly', 'yearly', 'stipend'],
        message: '{VALUE} is not a valid salary period',
      },
      default: 'yearly',
    },
  },
  { _id: false }
);

const jobSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter reference is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters'],
    },
    companyLogo: {
      type: String,
      trim: true,
    },
    logoBg: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters'],
    },
    employmentType: {
      type: String,
      required: [true, 'Employment type is required'],
      enum: {
        values: [
          'Full-time',
          'Part-time',
          'Contract',
          'Internship',
          'Remote',
          'Hybrid',
          'On-site',
        ],
        message: '{VALUE} is not a supported employment type',
      },
      index: true,
    },
    workplaceType: {
      type: String,
      enum: {
        values: ['on-site', 'hybrid', 'remote'],
        message: '{VALUE} is not a supported workplace type',
      },
      default: 'on-site',
      index: true,
    },
    experienceLevel: {
      type: String,
      enum: {
        values: ['fresher', 'internship', 'entry-level', 'mid-level', 'senior', 'lead'],
        message: '{VALUE} is not a supported experience level',
      },
      default: 'entry-level',
      index: true,
    },
    category: {
      type: String,
      trim: true,
      index: true,
    },
    requiredSkills: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    salaryRange: {
      type: salaryRangeSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: {
        values: ['draft', 'published', 'closed'],
        message: '{VALUE} is not a valid job status',
      },
      default: 'published',
      index: true,
    },
    department: {
      type: String,
      trim: true,
    },
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },
    urgent: {
      type: Boolean,
      default: false,
    },
    applicantCount: {
      type: Number,
      default: 0,
      min: [0, 'Applicant count cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for job search and filtering
jobSchema.index({ title: 1, location: 1 });
jobSchema.index({ company: 1 });
jobSchema.index({ category: 1, status: 1 });
jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ status: 1, createdAt: -1 });

// Full-text search index for keyword queries
jobSchema.index(
  {
    title: 'text',
    company: 'text',
    description: 'text',
    location: 'text',
    requiredSkills: 'text',
  },
  {
    weights: {
      title: 10,
      company: 5,
      requiredSkills: 5,
      location: 3,
      description: 1,
    },
    name: 'JobSearchTextIndex',
  }
);

const Job = mongoose.model('Job', jobSchema);

module.exports = Job;

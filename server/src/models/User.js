const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const educationSchema = new mongoose.Schema(
  {
    institution: {
      type: String,
      required: [true, 'Institution name is required'],
      trim: true,
      maxlength: 150,
    },
    degree: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    fieldOfStudy: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    startYear: {
      type: String,
      trim: true,
      maxlength: 10,
    },
    endYear: {
      type: String,
      trim: true,
      maxlength: 10,
    },
    current: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
  },
  { _id: true }
);

const experienceSchema = new mongoose.Schema(
  {
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: 150,
    },
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: 150,
    },
    location: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    startYear: {
      type: String,
      trim: true,
      maxlength: 10,
    },
    endYear: {
      type: String,
      trim: true,
      maxlength: 10,
    },
    current: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
  },
  { _id: true }
);

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Project title is required'],
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    link: {
      type: String,
      trim: true,
    },
    technologies: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  { _id: true }
);

const certificationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Certification name is required'],
      trim: true,
      maxlength: 150,
    },
    issuingOrganization: {
      type: String,
      required: [true, 'Issuing organization is required'],
      trim: true,
      maxlength: 150,
    },
    issueDate: {
      type: Date,
    },
    expiryDate: {
      type: Date,
    },
    credentialId: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    credentialUrl: {
      type: String,
      trim: true,
    },
  },
  { _id: true }
);

/**
 * Resume metadata sub-schema.
 * Stores private metadata and secure storage reference key (e.g. S3/Blob key)
 * rather than public file contents.
 */
const resumeMetadataSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      trim: true,
      maxlength: 255,
    },
    storageKey: {
      type: String,
      required: [true, 'Storage key reference is required'],
      trim: true,
    },
    mimeType: {
      type: String,
      trim: true,
      default: 'application/pdf',
    },
    sizeBytes: {
      type: Number,
      min: 0,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const jobPreferencesSchema = new mongoose.Schema(
  {
    desiredRoles: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    preferredCities: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    workplaceType: {
      type: String,
      enum: ['any', 'remote', 'hybrid', 'on-site'],
      default: 'any',
    },
    expectedSalary: {
      min: {
        type: Number,
        min: 0,
        default: null,
      },
      max: {
        type: Number,
        min: 0,
        default: null,
      },
      currency: {
        type: String,
        default: 'INR',
      },
    },
    employmentTypes: {
      type: [{ type: String, trim: true }],
      default: [],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    // Never store plain text passwords; holds salted bcrypt hash
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Omitted from query results by default for security
    },
    role: {
      type: String,
      enum: {
        values: ['candidate', 'recruiter', 'admin'],
        message: '{VALUE} is not a valid role',
      },
      default: 'candidate',
      index: true,
    },
    profile: {
      headline: {
        type: String,
        trim: true,
        maxlength: 150,
      },
      bio: {
        type: String,
        trim: true,
        maxlength: 2000,
      },
      phone: {
        type: String,
        trim: true,
        maxlength: 30,
      },
      location: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      avatarUrl: {
        type: String,
        trim: true,
      },
      // Candidate specific links
      website: {
        type: String,
        trim: true,
      },
      portfolio: {
        type: String,
        trim: true,
      },
      github: {
        type: String,
        trim: true,
      },
      linkedin: {
        type: String,
        trim: true,
      },
      twitter: {
        type: String,
        trim: true,
      },
      // Recruiter & Employer specific fields
      company: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      companyWebsite: {
        type: String,
        trim: true,
      },
      companyDescription: {
        type: String,
        trim: true,
        maxlength: 2000,
      },
      industry: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      companySize: {
        type: String,
        trim: true,
        maxlength: 50,
      },
      companyLogo: {
        type: String,
        trim: true,
      },
      headquarters: {
        type: String,
        trim: true,
        maxlength: 150,
      },
      companyRegistration: {
        type: String,
        trim: true,
        maxlength: 100,
      },
      verificationStatus: {
        type: String,
        enum: ['unverified', 'pending', 'verified'],
        default: 'unverified',
      },
    },
    skills: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    education: {
      type: [educationSchema],
      default: [],
    },
    experience: {
      type: [experienceSchema],
      default: [],
    },
    projects: {
      type: [projectSchema],
      default: [],
    },
    certifications: {
      type: [certificationSchema],
      default: [],
    },
    resume: {
      type: resumeMetadataSchema,
      default: null,
    },
    jobPreferences: {
      type: jobPreferencesSchema,
      default: () => ({}),
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Password reset subdocument (OTP & single-use reset token)
    passwordReset: {
      otpHash: {
        type: String,
        select: false,
      },
      otpExpiresAt: {
        type: Date,
      },
      otpAttempts: {
        type: Number,
        default: 0,
      },
      resetTokenHash: {
        type: String,
        select: false,
      },
      resetTokenExpiresAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index skills for talent queries
userSchema.index({ skills: 1 });
userSchema.index({ role: 1, createdAt: -1 });

/**
 * Compare plain text password with stored bcrypt hash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash || !candidatePassword) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Static method to hash a plain text password with bcrypt
 */
userSchema.statics.hashPassword = async function (password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compute profile completeness percentage based on role requirements
 */
userSchema.methods.calculateCompleteness = function () {
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

  // Candidate completeness
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
  if (this.jobPreferences && (this.jobPreferences.desiredRoles?.length > 0 || this.jobPreferences.preferredCities?.length > 0)) score += 5;
  return Math.min(100, score);
};

/**
 * Return safe user object omitting sensitive security fields
 */
userSchema.methods.toSafeObject = function () {
  const user = this.toObject();
  delete user.passwordHash;
  delete user.passwordReset;
  delete user.__v;
  user.completeness = this.calculateCompleteness();
  return user;
};

const User = mongoose.model('User', userSchema);

module.exports = User;

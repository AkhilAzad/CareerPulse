const mongoose = require('mongoose');

/**
 * Secure resume metadata sub-schema.
 * Stores private metadata and secure storage reference key (e.g. S3/Blob key)
 * rather than public file contents.
 */
const secureResumeSchema = new mongoose.Schema(
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

const recruiterNoteSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Note author is required'],
    },
    note: {
      type: String,
      required: [true, 'Note text is required'],
      trim: true,
      maxlength: [3000, 'Note cannot exceed 3000 characters'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const applicationSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate reference is required'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },
    resume: {
      type: secureResumeSchema,
      required: [true, 'Resume metadata is required'],
    },
    status: {
      type: String,
      enum: {
        values: [
          'submitted',
          'under_review',
          'shortlisted',
          'interview_scheduled',
          'rejected',
          'accepted',
        ],
        message: '{VALUE} is not a valid application status',
      },
      default: 'submitted',
      index: true,
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [5000, 'Cover letter cannot exceed 5000 characters'],
    },
    recruiterNotes: {
      type: [recruiterNoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications by creating a unique compound index on candidate and job
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

// Query optimization indexes
applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ candidate: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

module.exports = Application;

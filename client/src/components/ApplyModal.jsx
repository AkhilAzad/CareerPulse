import React, { useState, useEffect } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  Building2,
  MapPin,
  IndianRupee,
  Briefcase,
  AlertCircle,
  FileText,
  Send,
  Loader2,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { applyForJob } from '../services/applicationService';
import { formatSalary } from '../utils/jobFormatters';

export default function ApplyModal({ job, onClose, onApplied, onOpenAuth }) {
  const { user, isAuthenticated, isCandidate, isRecruiter } = useAuth();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    coverNote: '',
  });

  const [useProfileResume, setUseProfileResume] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [applicationResult, setApplicationResult] = useState(null);

  // Pre-populate candidate details from auth context
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.profile?.phone || '',
        portfolio: prev.portfolio || user.profile?.portfolio || user.profile?.website || '',
      }));

      // If user already has a resume saved on their profile, default to using it
      if (user.resume && user.resume.storageKey) {
        setUseProfileResume(true);
      }
    }
  }, [user]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && job) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [job, onClose]);

  if (!job) return null;

  const targetJobId = job._id || job.id;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExts = ['pdf', 'doc', 'docx'];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!allowedExts.includes(ext)) {
        setSubmitError('Please select a PDF, DOC, or DOCX document.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError('Resume file must be less than 5 MB.');
        return;
      }
      setSubmitError('');
      setResumeFile(file);
      setUploadedFileName(file.name);
      setUseProfileResume(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!isAuthenticated) {
      setSubmitError('Please sign in as a candidate to submit your application.');
      return;
    }

    if (isRecruiter) {
      setSubmitError('You are logged in with a recruiter account. Only candidates can apply for vacancies.');
      return;
    }

    if (!useProfileResume && !resumeFile) {
      setSubmitError('Please upload a resume file (PDF or DOCX) to apply.');
      return;
    }

    try {
      setIsSubmitting(true);

      let payload = {
        coverLetter: formData.coverNote ? formData.coverNote.trim() : undefined,
      };

      if (useProfileResume && user?.resume?.storageKey) {
        payload.useProfileResume = true;
      } else if (resumeFile) {
        // Read file as Base64 Data URL
        const base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(resumeFile);
        });

        payload.fileData = base64Data;
        payload.originalName = resumeFile.name;
        payload.mimeType = resumeFile.type || 'application/pdf';
        payload.sizeBytes = resumeFile.size;
      }

      const res = await applyForJob(targetJobId, payload);

      if (res && res.success) {
        setIsSubmitted(true);
        setApplicationResult(res.data);
        if (onApplied) {
          onApplied(res.data);
        }
      }
    } catch (err) {
      if (err.status === 409) {
        setSubmitError('You have already submitted an application for this position.');
      } else {
        setSubmitError(err.message || 'Failed to submit application. Please check your connection and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-apply-title"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-header-copy">
            <div className="modal-pre-title">Applicant Tracking Quick Apply</div>
            <h2 id="modal-apply-title" className="modal-title">{job.title}</h2>
            <div className="modal-job-meta">
              <span className="modal-meta-item">
                <Building2 size={14} aria-hidden="true" /> {job.company}
              </span>
              <span className="modal-meta-item">
                <MapPin size={14} aria-hidden="true" /> {job.location}
              </span>
              <span className="modal-meta-item">
                <IndianRupee size={14} aria-hidden="true" /> {formatSalary(job.salaryRange, job.salary)}
              </span>
              <span className="modal-meta-item">
                <Briefcase size={14} aria-hidden="true" /> {job.employmentType || job.type || 'Full-time'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close application dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Auth Guard Banner if not authenticated or if recruiter */}
        {!isAuthenticated && (
          <div className="modal-demo-notice alert-warning" role="alert">
            <ShieldAlert size={18} className="text-amber-500 shrink-0" aria-hidden="true" />
            <div className="flex-1 text-sm">
              <span>You must be signed in as a job seeker to submit an application. </span>
              {onOpenAuth && (
                <button
                  type="button"
                  className="btn btn-xs btn-outline inline-auth-btn"
                  onClick={() => {
                    onClose();
                    onOpenAuth('login');
                  }}
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        )}

        {isRecruiter && (
          <div className="modal-demo-notice alert-warning" role="alert">
            <AlertCircle size={18} className="text-amber-500 shrink-0" aria-hidden="true" />
            <div className="flex-1 text-sm">
              <span>Recruiter account active. Recruiters are not eligible to apply for positions. Please log in with a candidate account.</span>
            </div>
          </div>
        )}

        {submitError && (
          <div className="modal-demo-notice alert-danger" role="alert">
            <AlertCircle size={18} className="text-red-500 shrink-0" aria-hidden="true" />
            <span className="text-sm text-red-600 font-medium">{submitError}</span>
          </div>
        )}

        {/* Modal Body */}
        {isSubmitted ? (
          <div className="modal-success-state" role="status">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={48} className="text-emerald" aria-hidden="true" />
            </div>
            <h3 className="success-title">Application Submitted!</h3>
            <p className="success-desc">
              Your profile for <strong>{job.title}</strong> at <strong>{job.company}</strong> has
              been received and is now in the recruiter's applicant review pipeline.
            </p>
            <div className="success-details-card">
              <div>
                <strong>Candidate:</strong> {formData.fullName || user?.name || 'Applicant'}
              </div>
              <div>
                <strong>Email:</strong> {formData.email || user?.email || 'N/A'}
              </div>
              <div>
                <strong>Resume:</strong>{' '}
                {useProfileResume && user?.resume?.originalName
                  ? `${user.resume.originalName} (Profile Resume)`
                  : uploadedFileName || 'Uploaded Resume'}
              </div>
              <div>
                <strong>Status:</strong>{' '}
                <span className="badge-status-pill">
                  {applicationResult?.status === 'submitted' ? 'Submitted (Under Review)' : applicationResult?.status || 'Submitted'}
                </span>
              </div>
            </div>
            <button type="button" className="btn btn-primary w-full touch-target" onClick={onClose}>
              Done & Return to Jobs
            </button>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Full Name <span className="text-required">*</span>
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  required
                  placeholder="e.g. Aditi Sharma"
                  className="form-input"
                  value={formData.fullName}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email Address <span className="text-required">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="aditi.sharma@example.com"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="form-input"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="portfolio">
                  Portfolio or LinkedIn URL
                </label>
                <input
                  id="portfolio"
                  name="portfolio"
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  className="form-input"
                  value={formData.portfolio}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Resume Selection / Upload */}
            <div className="form-group">
              <label className="form-label" id="resume-upload-label">
                Resume / CV (PDF, DOCX) <span className="text-required">*</span>
              </label>

              {user?.resume?.originalName && (
                <div className="profile-resume-option-card">
                  <label className="profile-resume-radio-label">
                    <input
                      type="checkbox"
                      checked={useProfileResume}
                      onChange={(e) => {
                        setUseProfileResume(e.target.checked);
                        if (e.target.checked) {
                          setResumeFile(null);
                          setUploadedFileName('');
                        }
                      }}
                      className="form-checkbox"
                    />
                    <div className="profile-resume-meta">
                      <span className="profile-resume-name">
                        <FileText size={16} aria-hidden="true" />
                        Use profile resume: <strong>{user.resume.originalName}</strong>
                      </span>
                      <span className="profile-resume-hint">
                        Attached from your CareerPulse candidate profile
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {(!useProfileResume || !user?.resume?.originalName) && (
                <label className="file-upload-dropzone" htmlFor="resume-file-input">
                  <input
                    id="resume-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="file-upload-input"
                    onChange={handleFileUpload}
                    aria-labelledby="resume-upload-label"
                  />
                  <UploadCloud size={28} className="upload-icon" aria-hidden="true" />
                  <div className="upload-text">
                    {uploadedFileName ? (
                      <span className="file-selected-text">
                        <FileText size={16} aria-hidden="true" /> {uploadedFileName}
                      </span>
                    ) : (
                      <>
                        <strong>Click to upload</strong> or drag and drop your resume
                        <span className="upload-hint">PDF or Word document (max 5MB)</span>
                      </>
                    )}
                  </div>
                </label>
              )}
            </div>

            {/* Cover Note */}
            <div className="form-group">
              <label className="form-label" htmlFor="coverNote">
                Why are you a great fit? (Optional note)
              </label>
              <textarea
                id="coverNote"
                name="coverNote"
                rows={3}
                placeholder="Briefly highlight your experience with the required tech stack and why you are interested in this position..."
                className="form-textarea"
                value={formData.coverNote}
                onChange={handleChange}
                maxLength={5000}
              />
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost touch-target"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-submit-app touch-target"
                disabled={isSubmitting || isRecruiter}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="spinner" aria-hidden="true" />
                    <span>Submitting Application...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} aria-hidden="true" />
                    <span>Submit Application</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

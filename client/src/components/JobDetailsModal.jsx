import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Briefcase,
  IndianRupee,
  Clock,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  Flame,
  Star,
  Users,
  AlertCircle,
  Loader2,
  Building2,
  Globe,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { fetchJobById } from '../services/jobService';
import {
  formatSalary,
  formatRelativeTime,
  getCompanyInitials,
  formatIndianDate,
} from '../utils/jobFormatters';

export default function JobDetailsModal({
  jobId,
  initialJob = null,
  onClose,
  onApply,
  isSaved = false,
  onToggleSave,
  hasApplied = false,
}) {
  const [job, setJob] = useState(initialJob);
  const [loading, setLoading] = useState(!initialJob);
  const [error, setError] = useState('');

  const targetId = typeof jobId === 'object' ? jobId?._id || jobId?.id : jobId;

  // Load fresh details from GET /api/jobs/:id
  useEffect(() => {
    let isMounted = true;
    if (!targetId) return;

    const loadDetails = async () => {
      try {
        if (!initialJob) setLoading(true);
        setError('');
        const res = await fetchJobById(targetId);
        if (isMounted && res?.data) {
          setJob(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to load job details. The position may have been closed.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDetails();

    return () => {
      isMounted = false;
    };
  }, [targetId, initialJob]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeJobId = job?._id || job?.id || targetId;
  const title = job?.title || 'Job Details';
  const company = job?.company || 'Employer';
  const department = job?.department || job?.category || 'General';
  const location = job?.location || 'Remote (India)';
  const employmentType = job?.employmentType || job?.type || 'Full-time';
  const workplaceType = job?.workplaceType || 'On-site';
  const experienceLevel = job?.experienceLevel || 'Entry-level';
  const salaryText = formatSalary(job?.salaryRange, job?.salary);
  const postedText = formatRelativeTime(job?.createdAt, job?.postedTime);
  const fullPostedDate = formatIndianDate(job?.createdAt);
  const skills = Array.isArray(job?.requiredSkills)
    ? job.requiredSkills
    : Array.isArray(job?.tags)
    ? job.tags
    : [];
  const applicantCount = job?.applicantCount || 0;
  const companyLogo = job?.companyLogo || getCompanyInitials(company);
  const logoBg = job?.logoBg || '#2563eb';

  // Accurate verification status
  const verificationStatus = job?.recruiter?.profile?.verificationStatus || 'unverified';
  const companyHeadquarters = job?.recruiter?.profile?.headquarters;
  const companyWebsite = job?.recruiter?.profile?.companyWebsite;
  const companyIndustry = job?.recruiter?.profile?.industry;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-job-details-title"
    >
      <div
        className="modal-container job-details-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="job-details-company-lead">
            <div
              className="job-company-avatar details-avatar"
              style={{ backgroundColor: logoBg }}
              aria-hidden="true"
            >
              {companyLogo}
            </div>
            <div>
              <div className="job-company-name-row">
                <span className="job-company-name font-bold">{company}</span>
                {verificationStatus === 'verified' ? (
                  <span className="verified-badge-pill" title="Verified Organization">
                    <CheckCircle2 size={13} className="text-emerald" /> Verified
                  </span>
                ) : verificationStatus === 'pending' ? (
                  <span className="pending-badge-pill" title="Verification Pending Review">
                    <Clock size={11} /> Verification Pending
                  </span>
                ) : (
                  <span className="unverified-badge-pill" title="Unverified Recruiter Listing">
                    <ShieldAlert size={11} /> Unverified
                  </span>
                )}
              </div>
              <span className="job-department-text">{department}</span>
            </div>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close job details dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="job-details-loading-state" role="status">
            <Loader2 size={32} className="animate-spin text-primary" aria-hidden="true" />
            <p className="mt-2 text-sm text-muted">Loading position details from server...</p>
          </div>
        ) : error ? (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={20} className="shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : job ? (
          <div className="job-details-body">
            {/* Title & Badges */}
            <div className="job-details-title-row">
              <h2 id="modal-job-details-title" className="modal-title font-extrabold">
                {title}
              </h2>
              <div className="job-badges-group">
                {job.urgent && (
                  <span className="badge badge-urgent">
                    <Flame size={12} aria-hidden="true" /> Urgent
                  </span>
                )}
                {job.featured && (
                  <span className="badge badge-featured">
                    <Star size={12} aria-hidden="true" /> Featured
                  </span>
                )}
              </div>
            </div>

            {/* Quick Specs Grid (INR, India Location, Workplace, Experience) */}
            <div className="job-details-specs-grid">
              <div className="spec-card">
                <MapPin size={16} className="spec-icon" aria-hidden="true" />
                <div>
                  <span className="spec-label">Location</span>
                  <span className="spec-value">{location}</span>
                </div>
              </div>

              <div className="spec-card">
                <Briefcase size={16} className="spec-icon" aria-hidden="true" />
                <div>
                  <span className="spec-label">Workplace & Type</span>
                  <span className="spec-value">
                    {employmentType} • <span className="capitalize">{workplaceType}</span>
                  </span>
                </div>
              </div>

              <div className="spec-card">
                <IndianRupee size={16} className="spec-icon" aria-hidden="true" />
                <div>
                  <span className="spec-label">Compensation</span>
                  <span className="spec-value">
                    {(job?.salaryRange?.min != null || job?.salaryRange?.max != null || job?.salary)
                      ? salaryText
                      : 'Salary Not Disclosed'}
                  </span>
                </div>
              </div>

              <div className="spec-card">
                <Clock size={16} className="spec-icon" aria-hidden="true" />
                <div>
                  <span className="spec-label">Experience & Date</span>
                  <span className="spec-value capitalize">
                    {experienceLevel} • {fullPostedDate || postedText}
                  </span>
                </div>
              </div>
            </div>

            {/* Required Skills */}
            {skills.length > 0 && (
              <div className="job-details-section">
                <h3 className="section-subheading">Required Skills & Expertise</h3>
                <div className="job-tags-row">
                  {skills.map((skill, idx) => (
                    <span key={idx} className="job-tag-chip font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full Description */}
            <div className="job-details-section">
              <h3 className="section-subheading">About the Role</h3>
              <div className="job-description-content">
                <p className="whitespace-pre-line leading-relaxed">{job.description}</p>
              </div>
            </div>

            {/* Genuine Organization & Recruiter Info */}
            <div className="job-recruiter-card">
              <Building2 size={20} className="text-primary shrink-0" aria-hidden="true" />
              <div className="flex-1 text-xs">
                <div className="font-semibold text-main text-sm">
                  {company}
                  {companyHeadquarters && <span className="font-normal text-muted"> • HQ: {companyHeadquarters}</span>}
                </div>
                {companyIndustry && <p className="text-muted mt-0.5">Industry: {companyIndustry}</p>}
                {job.recruiter?.name && (
                  <p className="text-muted mt-0.5">
                    Posted by verified recruiter: <span className="text-main font-medium">{job.recruiter.name}</span>
                  </p>
                )}
                {companyWebsite && (
                  <a
                    href={companyWebsite}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 text-primary mt-1 font-medium hover:underline"
                  >
                    <span>Visit Company Website</span>
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className="job-details-actions-bar">
              <div className="applicants-meta">
                <Users size={16} className="text-muted" aria-hidden="true" />
                <span className="text-xs font-semibold text-muted">
                  {applicantCount} {applicantCount === 1 ? 'applicant' : 'applicants'} applied
                </span>
              </div>

              <div className="details-btn-group">
                {onToggleSave && (
                  <button
                    type="button"
                    className={`btn btn-outline btn-save-action ${isSaved ? 'btn-saved-active' : ''}`}
                    onClick={() => onToggleSave(activeJobId)}
                    aria-label={isSaved ? 'Saved job' : 'Save position'}
                  >
                    <Bookmark size={16} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
                    <span>{isSaved ? 'Saved' : 'Save'}</span>
                  </button>
                )}

                {hasApplied ? (
                  <button
                    type="button"
                    className="btn btn-outline btn-applied-indicator touch-target"
                    disabled
                  >
                    <CheckCircle2 size={16} className="text-emerald" aria-hidden="true" />
                    <span>Application Submitted</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-apply-action touch-target"
                    onClick={() => {
                      onClose();
                      if (onApply) onApply(job);
                    }}
                    aria-label={`Apply for ${title} at ${company}`}
                  >
                    <span>Apply Now</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

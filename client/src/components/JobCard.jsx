import React from 'react';
import {
  MapPin,
  Briefcase,
  IndianRupee,
  Clock,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  Flame,
  Star,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { formatSalary, formatRelativeTime, getCompanyInitials } from '../utils/jobFormatters';

export default function JobCard({
  job,
  onApply,
  isSaved,
  onToggleSave,
  onViewDetails,
  hasApplied = false,
}) {
  const jobId = job._id || job.id;
  const title = job.title || 'Untitled Position';
  const company = job.company || 'Confidential Employer';
  const department = job.department || job.category || 'General';
  const location = job.location || 'Remote (India)';
  const employmentType = job.employmentType || job.type || 'Full-time';
  const formattedSalary = formatSalary(job.salaryRange, job.salary);
  const formattedPostedTime = formatRelativeTime(job.createdAt, job.postedTime);
  const skills = Array.isArray(job.requiredSkills)
    ? job.requiredSkills
    : Array.isArray(job.tags)
    ? job.tags
    : [];
  const applicantCount = job.applicantCount || 0;
  const companyLogo = job.companyLogo || getCompanyInitials(company);
  const logoBg = job.logoBg || '#2563eb';

  // Accurate verification status from recruiter profile
  const verificationStatus = job.recruiter?.profile?.verificationStatus || 'unverified';

  return (
    <article className="job-card" onClick={() => onViewDetails && onViewDetails(job)}>
      <div className="job-card-inner">
        {/* Card Header */}
        <div className="job-card-header">
          <div className="job-company-group">
            <div
              className="job-company-avatar"
              style={{ backgroundColor: logoBg }}
              title={company}
              aria-hidden="true"
            >
              {companyLogo}
            </div>
            <div className="job-company-info">
              <div className="job-company-name-row">
                <span className="job-company-name">{company}</span>
                {verificationStatus === 'verified' ? (
                  <span className="verified-badge-pill" title="Verified Employer">
                    <CheckCircle2 size={12} className="text-emerald" /> Verified
                  </span>
                ) : verificationStatus === 'pending' ? (
                  <span className="pending-badge-pill" title="Company Verification Under Review">
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
            <button
              type="button"
              className={`btn-bookmark ${isSaved ? 'btn-bookmark-saved' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleSave(jobId);
              }}
              title={isSaved ? 'Remove from saved jobs' : 'Save job'}
              aria-label={isSaved ? `Remove ${title} from saved jobs` : `Save ${title}`}
              aria-pressed={isSaved}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Job Title */}
        <h3 className="job-card-title">
          <button
            type="button"
            className="job-title-link"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) onViewDetails(job);
            }}
          >
            {title}
          </button>
        </h3>

        {/* Job Meta Chips */}
        <div className="job-meta-row">
          <div className="job-meta-item">
            <MapPin size={15} className="meta-icon" aria-hidden="true" />
            <span>{location}</span>
          </div>
          <div className="job-meta-item">
            <Briefcase size={15} className="meta-icon" aria-hidden="true" />
            <span className="meta-job-type">{employmentType}</span>
            {job.experienceLevel && job.experienceLevel !== 'entry-level' && (
              <span className="meta-exp-tag">({job.experienceLevel})</span>
            )}
          </div>
          {(job.salaryRange?.min != null || job.salaryRange?.max != null || job.salary) && formattedSalary && (
            <div className="job-meta-item job-salary-item">
              <IndianRupee size={15} className="meta-icon" aria-hidden="true" />
              <span>{formattedSalary}</span>
            </div>
          )}
          <div className="job-meta-item text-muted">
            <Clock size={15} className="meta-icon" aria-hidden="true" />
            <span>{formattedPostedTime}</span>
          </div>
        </div>

        {/* Short Description */}
        <p className="job-card-description">{job.description}</p>

        {/* Skills / Tech Tags */}
        {skills.length > 0 && (
          <div className="job-tags-row">
            {skills.map((skill, idx) => (
              <span key={idx} className="job-tag-chip">
                {skill}
              </span>
            ))}
          </div>
        )}

        {/* Card Footer / Action */}
        <div className="job-card-footer">
          <div className="job-applicants-indicator">
            <span className="applicants-count-badge">
              {applicantCount} {applicantCount === 1 ? 'applicant' : 'applicants'} applied
            </span>
          </div>
          <div className="job-card-actions">
            {onViewDetails && (
              <button
                type="button"
                className="btn btn-ghost btn-details-link touch-target"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails(job);
                }}
                aria-label={`View details for ${title}`}
              >
                <span>Details</span>
                <ExternalLink size={14} aria-hidden="true" />
              </button>
            )}
            {hasApplied ? (
              <span className="badge-applied-pill" aria-label={`Applied for ${title}`}>
                <CheckCircle2 size={14} aria-hidden="true" />
                <span>Applied</span>
              </span>
            ) : (
              <button
                type="button"
                className="btn btn-apply-card touch-target"
                onClick={(e) => {
                  e.stopPropagation();
                  onApply(job);
                }}
                aria-label={`Apply for ${title} at ${company}`}
              >
                <span>Apply Now</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

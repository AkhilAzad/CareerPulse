import React from 'react';
import {
  MapPin,
  Briefcase,
  DollarSign,
  Clock,
  Bookmark,
  CheckCircle2,
  ArrowRight,
  Flame,
  Star,
} from 'lucide-react';

export default function JobCard({ job, onApply, isSaved, onToggleSave }) {
  return (
    <article className="job-card">
      <div className="job-card-inner">
        {/* Card Header */}
        <div className="job-card-header">
          <div className="job-company-group">
            <div
              className="job-company-avatar"
              style={{ backgroundColor: job.logoBg || '#2563eb' }}
              title={job.company}
              aria-hidden="true"
            >
              {job.companyLogo || job.company.slice(0, 2).toUpperCase()}
            </div>
            <div className="job-company-info">
              <div className="job-company-name-row">
                <span className="job-company-name">{job.company}</span>
                <CheckCircle2
                  size={14}
                  className="company-verified-icon"
                  title="Verified Employer"
                  aria-label="Verified Employer"
                />
              </div>
              <span className="job-department-text">{job.department}</span>
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
                onToggleSave(job.id);
              }}
              title={isSaved ? 'Remove from saved jobs' : 'Save job'}
              aria-label={isSaved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
              aria-pressed={isSaved}
            >
              <Bookmark size={18} fill={isSaved ? 'currentColor' : 'none'} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Job Title */}
        <h3 className="job-card-title">{job.title}</h3>

        {/* Job Meta Chips */}
        <div className="job-meta-row">
          <div className="job-meta-item">
            <MapPin size={15} className="meta-icon" aria-hidden="true" />
            <span>{job.location}</span>
          </div>
          <div className="job-meta-item">
            <Briefcase size={15} className="meta-icon" aria-hidden="true" />
            <span className="meta-job-type">{job.type}</span>
          </div>
          <div className="job-meta-item job-salary-item">
            <DollarSign size={15} className="meta-icon" aria-hidden="true" />
            <span>{job.salary}</span>
          </div>
          <div className="job-meta-item text-muted">
            <Clock size={15} className="meta-icon" aria-hidden="true" />
            <span>{job.postedTime}</span>
          </div>
        </div>

        {/* Short Description */}
        <p className="job-card-description">{job.description}</p>

        {/* Skills / Tech Tags */}
        <div className="job-tags-row">
          {job.tags.map((tag, idx) => (
            <span key={idx} className="job-tag-chip">
              {tag}
            </span>
          ))}
        </div>

        {/* Card Footer / Action */}
        <div className="job-card-footer">
          <div className="job-applicants-indicator">
            <span className="applicants-count-badge">
              {job.applicantCount} applicants applied
            </span>
          </div>
          <div className="job-card-actions">
            <button
              type="button"
              className="btn btn-apply-card"
              onClick={() => onApply(job)}
              aria-label={`Apply for ${job.title} at ${job.company}`}
            >
              <span>Apply Now</span>
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

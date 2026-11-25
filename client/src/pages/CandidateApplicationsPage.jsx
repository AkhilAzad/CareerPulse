import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Award,
  X,
  MessageSquare,
  Loader2,
  Filter,
  Check,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMyApplications, downloadApplicantResume } from '../services/applicationService';
import {
  formatSalary,
  formatRelativeTime,
  formatIndianDate,
  getCompanyInitials,
} from '../utils/jobFormatters';

const STAGES = [
  { id: 'all', label: 'All Applications' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview_scheduled', label: 'Interview Scheduled' },
  { id: 'accepted', label: 'Accepted / Offer' },
  { id: 'rejected', label: 'Rejected' },
];

const STAGE_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  interview_scheduled: 'Interview Scheduled',
  accepted: 'Offer Accepted / Extended',
  rejected: 'Not Selected',
};

const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

/**
 * Visual ATS Pipeline Stepper component for candidate progress feedback
 */
function ApplicationPipelineStepper({ status }) {
  const steps = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'under_review', label: 'Under Review' },
    { key: 'interview', label: 'Shortlist & Interview' },
    { key: 'decision', label: status === 'rejected' ? 'Not Selected' : 'Offer / Final' },
  ];

  let currentStepIndex = 0;
  if (status === 'submitted') currentStepIndex = 0;
  else if (status === 'under_review') currentStepIndex = 1;
  else if (status === 'shortlisted' || status === 'interview_scheduled') currentStepIndex = 2;
  else if (status === 'accepted' || status === 'rejected') currentStepIndex = 3;

  return (
    <div className="candidate-stepper-wrap" aria-label="Application Progress">
      <div className="candidate-stepper-track">
        {steps.map((step, idx) => {
          const isDone = idx < currentStepIndex || (idx === currentStepIndex && status === 'accepted');
          const isCurrent = idx === currentStepIndex && status !== 'accepted';
          const isRejected = idx === 3 && status === 'rejected';

          return (
            <div
              key={step.key}
              className={`stepper-step ${isDone ? 'is-done' : ''} ${isCurrent ? 'is-current' : ''} ${
                isRejected ? 'is-rejected' : ''
              }`}
            >
              <div className="step-circle">
                {isRejected ? (
                  <X size={13} aria-hidden="true" />
                ) : isDone ? (
                  <Check size={13} aria-hidden="true" />
                ) : isCurrent ? (
                  <span className="step-pulsing-dot" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className="step-label">{step.label}</span>
              {idx < steps.length - 1 && (
                <div className={`step-connector ${idx < currentStepIndex ? 'connector-done' : ''}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CandidateApplicationsPage({ onViewJobDetails }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const showFeedback = (text, type = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetchMyApplications({ limit: 100 });
      if (res?.data) {
        setApplications(res.data);
      } else {
        setApplications([]);
      }
    } catch (err) {
      if (err.status === 401) {
        setError('Your session has expired. Please sign in again.');
        if (logout) logout();
      } else {
        setError(err.message || 'Unable to load your applications. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  // Compute stage breakdown counts
  const stageCounts = useMemo(() => {
    const counts = { all: applications.length };
    STAGES.forEach((s) => {
      if (s.id !== 'all') counts[s.id] = 0;
    });

    applications.forEach((app) => {
      if (app.status && counts[app.status] !== undefined) {
        counts[app.status]++;
      }
    });

    return counts;
  }, [applications]);

  // Filter applications by stage and keyword
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (selectedStage !== 'all' && app.status !== selectedStage) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const jobTitle = (app.job?.title || '').toLowerCase();
        const company = (app.job?.company || '').toLowerCase();
        const location = (app.job?.location || '').toLowerCase();
        const matchesQuery =
          jobTitle.includes(q) || company.includes(q) || location.includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [applications, selectedStage, searchQuery]);

  // Handle resume download
  const handleDownloadResume = async (applicationId, filename = 'resume.pdf') => {
    try {
      setDownloadingId(applicationId);
      await downloadApplicantResume(applicationId);
      showFeedback(`Downloaded resume "${filename}".`, 'success');
    } catch (err) {
      if (err.status === 401 && logout) {
        logout();
      }
      showFeedback(err.message || 'Unable to download resume file.', 'error');
    } finally {
      setDownloadingId(null);
    }
  };

  // Metrics calculation
  const totalApplied = applications.length;
  const inReviewCount = (stageCounts.submitted || 0) + (stageCounts.under_review || 0);
  const interviewingCount =
    (stageCounts.shortlisted || 0) + (stageCounts.interview_scheduled || 0);
  const acceptedCount = stageCounts.accepted || 0;

  return (
    <div className="candidate-applications-page">
      {/* Toast Feedback Notification */}
      {feedbackMessage && (
        <div
          className={`dashboard-toast toast-${feedbackMessage.type}`}
          role="status"
          aria-live="polite"
        >
          {feedbackMessage.type === 'error' ? (
            <AlertCircle size={18} aria-hidden="true" />
          ) : (
            <CheckCircle2 size={18} aria-hidden="true" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      <div className="dashboard-container">
        {/* Top Header Section */}
        <div className="dashboard-header">
          <div className="dashboard-header-copy">
            <button
              type="button"
              className="btn btn-ghost btn-back-home"
              onClick={() => navigate('/')}
              aria-label="Return to job listings board"
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Return to Job Board</span>
            </button>

            <div className="dashboard-title-group">
              <h1 className="dashboard-title">My Job Applications</h1>
              <div className="dashboard-company-badge">
                <Briefcase size={15} aria-hidden="true" />
                <span>{user?.name ? `${user.name}'s Tracker` : 'Candidate Portal'}</span>
                <span className="badge-verified-mini">Active Applicant</span>
              </div>
            </div>

            <p className="dashboard-subtitle">
              Monitor real-time hiring progress across your submitted applications, track recruiter evaluations, and access your attached resumes.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button
              type="button"
              className="btn btn-outline touch-target"
              onClick={loadApplications}
              disabled={loading}
              title="Refresh application statuses"
            >
              <RotateCcw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
              <span>Refresh Status</span>
            </button>
            <button
              type="button"
              className="btn btn-primary touch-target"
              onClick={() => navigate('/')}
            >
              <Search size={16} aria-hidden="true" />
              <span>Find More Jobs</span>
            </button>
          </div>
        </div>

        {/* Application Status Metric Summary Cards */}
        <div className="dashboard-metrics-grid">
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Total Applications</span>
              <div className="metric-icon-box bg-blue-subtle">
                <Briefcase size={20} className="text-primary" />
              </div>
            </div>
            <div className="metric-value">{totalApplied}</div>
            <div className="metric-subtext">Positions applied across India</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Under Active Review</span>
              <div className="metric-icon-box bg-amber-subtle">
                <Clock size={20} className="text-amber" />
              </div>
            </div>
            <div className="metric-value">{inReviewCount}</div>
            <div className="metric-subtext">Awaiting recruiter evaluation</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Shortlisted & Interviews</span>
              <div className="metric-icon-box bg-purple-subtle">
                <Sparkles size={20} className="text-purple" />
              </div>
            </div>
            <div className="metric-value">{interviewingCount}</div>
            <div className="metric-subtext">Progressed to hiring rounds</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Offers & Hired</span>
              <div className="metric-icon-box bg-emerald-subtle">
                <Award size={20} className="text-emerald" />
              </div>
            </div>
            <div className="metric-value">{acceptedCount}</div>
            <div className="metric-subtext">Accepted applications</div>
          </div>
        </div>

        {/* Filter and Search Controls Bar */}
        <div className="pipeline-controls-card">
          <div className="candidate-controls-row">
            {/* Search Input */}
            <div className="control-search-box flex-1">
              <label htmlFor="application-search-input" className="control-label">
                Search Applications:
              </label>
              <div className="search-input-wrapper">
                <Search size={16} className="search-icon-left" />
                <input
                  id="application-search-input"
                  type="text"
                  className="form-input search-input"
                  placeholder="Filter by job title, company name, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Stage Filter Chips */}
          <div className="stage-filter-chips">
            <span className="stage-filter-label">Filter by Stage:</span>
            <div className="chips-scroll-container">
              {STAGES.map((s) => {
                const count = stageCounts[s.id] || 0;
                const isSelected = selectedStage === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`stage-chip-btn ${isSelected ? 'active' : ''} stage-${s.id}`}
                    onClick={() => setSelectedStage(s.id)}
                  >
                    <span>{s.label}</span>
                    <span className="stage-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Applications List Body */}
        {loading ? (
          <div className="dashboard-loading-state" role="status" aria-busy="true">
            <Loader2 size={36} className="animate-spin text-primary" />
            <h3>Loading Your Applications</h3>
            <p>Retrieving your real-time application records from CareerPulse ATS...</p>
          </div>
        ) : error ? (
          <div className="dashboard-error-state" role="alert">
            <AlertCircle size={40} className="text-rose" />
            <h3>Unable to Load Applications</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={loadApplications}
            >
              <RotateCcw size={16} />
              <span>Retry</span>
            </button>
          </div>
        ) : applications.length === 0 ? (
          <div className="dashboard-empty-state">
            <Briefcase size={44} className="text-muted" />
            <h3>No Job Applications Yet</h3>
            <p>
              You haven't applied to any job openings on CareerPulse ATS yet. Explore top engineering, product, and tech roles across India to get started!
            </p>
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => navigate('/')}
            >
              <Search size={16} />
              <span>Browse Job Openings</span>
            </button>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="dashboard-empty-state">
            <Filter size={40} className="text-muted" />
            <h3>No Matching Applications</h3>
            <p>
              No submitted applications match the selected stage filter or search keyword.
            </p>
            <button
              type="button"
              className="btn btn-outline mt-3"
              onClick={() => {
                setSelectedStage('all');
                setSearchQuery('');
              }}
            >
              <X size={16} />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="candidate-apps-list" role="list">
            {filteredApplications.map((app) => {
              const job = app.job || {};
              const jobTitle = job.title || 'Untitled Opening';
              const companyName = job.company || 'Company';
              const location = job.location || 'India';
              const employmentType = job.employmentType || 'Full-time';
              const workplaceType = job.workplaceType || 'On-site';
              const salaryFormatted = formatSalary(job.salaryRange);
              const initials = getCompanyInitials(companyName);
              const isClosed = job.status === 'closed';

              const resume = app.resume || {};
              const resumeName = resume.originalName || 'Attached_Resume.pdf';
              const resumeSize = formatBytes(resume.sizeBytes);
              const resumeUploadDate = resume.uploadedAt
                ? formatIndianDate(resume.uploadedAt)
                : formatIndianDate(app.createdAt);

              const isDownloadingThis = downloadingId === app._id;

              return (
                <article key={app._id} className="candidate-app-card" role="listitem">
                  {/* Card Header Row */}
                  <div className="candidate-app-header">
                    <div className="candidate-app-main-info">
                      {/* Company Avatar / Logo */}
                      <div
                        className="candidate-app-avatar"
                        style={{ backgroundColor: job.logoBg || '#2563eb' }}
                        aria-hidden="true"
                      >
                        {job.companyLogo ? (
                          <img
                            src={job.companyLogo}
                            alt={companyName}
                            className="candidate-app-logo-img"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{initials}</span>
                        )}
                      </div>

                      {/* Job & Company Details */}
                      <div className="candidate-app-title-group">
                        <div className="candidate-app-title-row">
                          <h2
                            className="candidate-app-job-title"
                            onClick={() => onViewJobDetails && onViewJobDetails(job)}
                            title="Click to view full job opening details"
                          >
                            {jobTitle}
                          </h2>
                          {isClosed && (
                            <span className="job-status-badge badge-closed">Position Closed</span>
                          )}
                        </div>

                        <div className="candidate-app-company-row">
                          <span className="candidate-app-company-name">
                            <Building2 size={14} aria-hidden="true" />
                            {companyName}
                          </span>
                          <span className="candidate-app-location">
                            <MapPin size={14} aria-hidden="true" />
                            {location}
                          </span>
                        </div>

                        {/* Badges Row */}
                        <div className="candidate-app-tags-row">
                          <span className="badge-tag">{employmentType}</span>
                          <span className="badge-tag capitalize">{workplaceType}</span>
                          {salaryFormatted && salaryFormatted !== 'Competitive' && (
                            <span className="badge-tag salary-tag">{salaryFormatted}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Applied Timestamp */}
                    <div className="candidate-app-status-box">
                      <span className={`stage-select-input stage-badge-${app.status} status-display-pill`}>
                        {app.status === 'submitted' && <Clock size={13} aria-hidden="true" />}
                        {app.status === 'under_review' && <Clock size={13} aria-hidden="true" />}
                        {app.status === 'shortlisted' && <Sparkles size={13} aria-hidden="true" />}
                        {app.status === 'interview_scheduled' && <Calendar size={13} aria-hidden="true" />}
                        {app.status === 'accepted' && <Award size={13} aria-hidden="true" />}
                        {app.status === 'rejected' && <X size={13} aria-hidden="true" />}
                        <span>{STAGE_LABELS[app.status] || app.status}</span>
                      </span>

                      <span className="candidate-applied-time">
                        <Calendar size={13} aria-hidden="true" />
                        Applied {formatIndianDate(app.createdAt)} ({formatRelativeTime(app.createdAt)})
                      </span>
                    </div>
                  </div>

                  {/* Visual Hiring Pipeline Progression Stepper */}
                  <ApplicationPipelineStepper status={app.status} />

                  {/* Resume Attached & Notes Row */}
                  <div className="candidate-app-body-grid">
                    {/* Resume Card */}
                    <div className="candidate-resume-info-card">
                      <div className="candidate-resume-icon-box">
                        <FileText size={20} className="text-primary" />
                      </div>
                      <div className="candidate-resume-meta">
                        <span className="candidate-resume-name" title={resumeName}>
                          {resumeName}
                        </span>
                        <span className="candidate-resume-details">
                          {resumeSize} • Uploaded {resumeUploadDate}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline btn-resume-download"
                        onClick={() => handleDownloadResume(app._id, resumeName)}
                        disabled={isDownloadingThis}
                        title="Download attached application resume"
                      >
                        {isDownloadingThis ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        <span>{isDownloadingThis ? 'Downloading...' : 'Download Resume'}</span>
                      </button>
                    </div>

                    {/* Candidate Cover Note Snippet (if provided) */}
                    {app.coverLetter && (
                      <div className="candidate-cover-card">
                        <div className="candidate-cover-header">
                          <MessageSquare size={14} className="text-muted" />
                          <span className="candidate-cover-title">Your Cover Note:</span>
                        </div>
                        <p className="candidate-cover-snippet">"{app.coverLetter}"</p>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="candidate-app-footer">
                    <div className="candidate-app-footer-left">
                      <span className="footer-meta-note">
                        Recruiter Application ID: <code>{app._id.slice(-8)}</code>
                      </span>
                    </div>

                    <div className="candidate-app-footer-actions">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => onViewJobDetails && onViewJobDetails(job)}
                        title="View job description, requirements, and company info"
                      >
                        <ExternalLink size={14} aria-hidden="true" />
                        <span>View Position Details</span>
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

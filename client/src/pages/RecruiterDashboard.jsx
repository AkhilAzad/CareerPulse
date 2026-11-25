import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Briefcase,
  Users,
  Search,
  Filter,
  ArrowLeft,
  Building2,
  MapPin,
  IndianRupee,
  Calendar,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  MessageSquare,
  ChevronDown,
  Loader2,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Send,
  Eye,
  Check,
  X,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchMyJobs, updateJobStatus } from '../services/jobService';
import {
  fetchJobApplications,
  updateApplicationStatus,
  addRecruiterNote,
  downloadApplicantResume,
} from '../services/applicationService';
import { resolveAvatarUrl } from '../services/userService';
import {
  formatSalary,
  formatRelativeTime,
  formatIndianDate,
  getUserInitials,
} from '../utils/jobFormatters';
import PostJobModal from '../components/PostJobModal';

const STAGES = [
  { id: 'all', label: 'All Stages' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'under_review', label: 'Under Review' },
  { id: 'shortlisted', label: 'Shortlisted' },
  { id: 'interview_scheduled', label: 'Interview Scheduled' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'rejected', label: 'Rejected' },
];

export default function RecruiterDashboard() {
  const { user, isRecruiter } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Active view: 'pipeline' or 'jobs'
  const [activeTab, setActiveTab] = useState('pipeline');

  // Jobs data
  const [jobs, setJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState('');

  // Selected job filter ('all' or specific job ID)
  const [selectedJobId, setSelectedJobId] = useState('all');

  // Selected stage filter
  const [selectedStage, setSelectedStage] = useState('all');

  // Candidate keyword search query
  const [candidateQuery, setCandidateQuery] = useState('');

  // Applications data
  const [applications, setApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);
  const [applicationsError, setApplicationsError] = useState('');

  // Modals state
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [notesModalApp, setNotesModalApp] = useState(null);
  const [newNoteText, setNewNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');

  // Action loading states
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [downloadingResumeId, setDownloadingResumeId] = useState(null);
  const [updatingJobStatusId, setUpdatingJobStatusId] = useState(null);

  // Success toast/banner
  const [feedbackMessage, setFeedbackMessage] = useState(null);

  const showFeedback = (text, type = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => {
      setFeedbackMessage(null);
    }, 4000);
  };

  // 1. Fetch Recruiter Jobs
  const loadRecruiterJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      setJobsError('');
      const res = await fetchMyJobs({ limit: 50 });
      if (res?.data) {
        setJobs(res.data);
      }
    } catch (err) {
      setJobsError(err.message || 'Unable to load your job postings.');
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  // 2. Fetch Applications for selected job or all jobs
  const loadApplications = useCallback(async (jobId = 'all', stage = 'all') => {
    try {
      setLoadingApplications(true);
      setApplicationsError('');
      const params = { limit: 100 };
      if (stage && stage !== 'all') {
        params.status = stage;
      }
      const res = await fetchJobApplications(jobId, params);
      if (res?.data) {
        setApplications(res.data);
      }
    } catch (err) {
      setApplicationsError(err.message || 'Unable to load candidate applications.');
    } finally {
      setLoadingApplications(false);
    }
  }, []);

  // Initial data loading
  useEffect(() => {
    loadRecruiterJobs();
  }, [loadRecruiterJobs]);

  useEffect(() => {
    loadApplications(selectedJobId, selectedStage);
  }, [selectedJobId, selectedStage, loadApplications]);

  // Handle View Applicants from job row
  const handleViewJobApplicants = (jobId) => {
    setSelectedJobId(jobId);
    setActiveTab('pipeline');
  };

  // Handle stage change for an application
  const handleStatusChange = async (applicationId, newStatus) => {
    try {
      setUpdatingStatusId(applicationId);
      const res = await updateApplicationStatus(applicationId, newStatus);
      if (res?.data) {
        setApplications((prev) =>
          prev.map((app) =>
            app._id === applicationId ? { ...app, status: newStatus } : app
          )
        );
        showFeedback(`Application status updated to ${newStatus.replace('_', ' ')}.`);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update application status.', 'error');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Handle job status change (published, draft, closed)
  const handleJobStatusChange = async (jobId, newStatus) => {
    try {
      setUpdatingJobStatusId(jobId);
      const res = await updateJobStatus(jobId, newStatus);
      if (res?.data) {
        setJobs((prev) =>
          prev.map((job) =>
            job._id === jobId ? { ...job, status: newStatus } : job
          )
        );
        showFeedback(`Job listing status updated to ${newStatus}.`);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update job status.', 'error');
    } finally {
      setUpdatingJobStatusId(null);
    }
  };

  // Handle secure resume download
  const handleDownloadResume = async (applicationId, applicantName = 'Applicant') => {
    try {
      setDownloadingResumeId(applicationId);
      await downloadApplicantResume(applicationId);
      showFeedback(`Downloaded resume for ${applicantName}.`);
    } catch (err) {
      showFeedback(err.message || 'Unable to download applicant resume.', 'error');
    } finally {
      setDownloadingResumeId(null);
    }
  };

  // Handle adding a recruiter evaluation note
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!notesModalApp || !newNoteText.trim()) return;

    try {
      setSavingNote(true);
      setNoteError('');
      const res = await addRecruiterNote(notesModalApp._id, newNoteText.trim());
      if (res?.data) {
        // Update local application state with new notes
        setApplications((prev) =>
          prev.map((app) =>
            app._id === notesModalApp._id ? { ...app, recruiterNotes: res.data } : app
          )
        );
        setNotesModalApp((prev) => ({
          ...prev,
          recruiterNotes: res.data,
        }));
        setNewNoteText('');
        showFeedback('Recruiter evaluation note added successfully.');
      }
    } catch (err) {
      setNoteError(err.message || 'Failed to save note.');
    } finally {
      setSavingNote(false);
    }
  };

  // Filter applications by client-side candidate search query
  const filteredApplications = useMemo(() => {
    if (!candidateQuery.trim()) return applications;
    const q = candidateQuery.toLowerCase().trim();
    return applications.filter((app) => {
      const name = app.candidate?.name?.toLowerCase() || '';
      const email = app.candidate?.email?.toLowerCase() || '';
      const headline = app.candidate?.profile?.headline?.toLowerCase() || '';
      const skills = Array.isArray(app.candidate?.skills)
        ? app.candidate.skills.join(' ').toLowerCase()
        : '';
      return name.includes(q) || email.includes(q) || headline.includes(q) || skills.includes(q);
    });
  }, [applications, candidateQuery]);

  // Stage breakdown counts
  const stageCounts = useMemo(() => {
    const counts = { all: applications.length };
    STAGES.forEach((s) => {
      if (s.id !== 'all') {
        counts[s.id] = applications.filter((a) => a.status === s.id).length;
      }
    });
    return counts;
  }, [applications]);

  // Summary Metrics
  const totalApplicants = useMemo(() => {
    return jobs.reduce((acc, job) => acc + (job.applicantCount || 0), 0);
  }, [jobs]);

  const activeJobsCount = useMemo(() => {
    return jobs.filter((job) => job.status === 'published').length;
  }, [jobs]);

  return (
    <div className="recruiter-dashboard-page">
      {/* Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`dashboard-toast toast-${feedbackMessage.type}`}
          role="status"
          aria-live="polite"
        >
          {feedbackMessage.type === 'error' ? (
            <AlertCircle size={18} className="shrink-0" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0" />
          )}
          <span>{feedbackMessage.text}</span>
          <button
            type="button"
            className="toast-close-btn"
            onClick={() => setFeedbackMessage(null)}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="dashboard-container">
        {/* Top Header */}
        <div className="dashboard-header">
          <div className="dashboard-header-copy">
            <button
              type="button"
              className="btn btn-ghost btn-back-home"
              onClick={() => navigate('/')}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Return to Job Board</span>
            </button>
            <div className="dashboard-title-group">
              <h1 className="dashboard-title">Recruiter Applicant Pipeline</h1>
              <div className="dashboard-company-badge">
                <Building2 size={15} aria-hidden="true" />
                <span>{user?.profile?.company || `${user?.name || 'Recruiter'}'s Company`}</span>
                <span className="badge-verified-mini">Verified Recruiter</span>
              </div>
            </div>
            <p className="dashboard-subtitle">
              Manage your job vacancies, review incoming candidate applications, transition recruitment stages, and collaborate with private notes.
            </p>
          </div>

          <div className="dashboard-header-actions">
            <button
              type="button"
              className="btn btn-primary btn-post-job-action touch-target"
              onClick={() => setIsPostJobOpen(true)}
            >
              <PlusCircle size={17} aria-hidden="true" />
              <span>Post New Job</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="dashboard-metrics-grid">
          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Total Jobs Posted</span>
              <div className="metric-icon-box bg-blue-subtle">
                <Briefcase size={20} className="text-primary" />
              </div>
            </div>
            <div className="metric-value">{jobs.length}</div>
            <div className="metric-subtext">
              <strong>{activeJobsCount}</strong> currently published
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Total Candidates Applied</span>
              <div className="metric-icon-box bg-emerald-subtle">
                <Users size={20} className="text-emerald" />
              </div>
            </div>
            <div className="metric-value">{totalApplicants}</div>
            <div className="metric-subtext">Across all active postings</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Under Active Review</span>
              <div className="metric-icon-box bg-amber-subtle">
                <Clock size={20} className="text-amber" />
              </div>
            </div>
            <div className="metric-value">
              {(stageCounts.under_review || 0) + (stageCounts.submitted || 0)}
            </div>
            <div className="metric-subtext">Awaiting recruiter evaluation</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <span className="metric-label">Shortlisted & Interviews</span>
              <div className="metric-icon-box bg-purple-subtle">
                <FileCheck size={20} className="text-purple" />
              </div>
            </div>
            <div className="metric-value">
              {(stageCounts.shortlisted || 0) + (stageCounts.interview_scheduled || 0)}
            </div>
            <div className="metric-subtext">Progressed in hiring pipeline</div>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="dashboard-tabs-bar">
          <div className="dashboard-tabs-group" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'pipeline'}
              className={`dashboard-tab-btn ${activeTab === 'pipeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('pipeline')}
            >
              <Users size={16} aria-hidden="true" />
              <span>Applicant Pipeline</span>
              <span className="tab-count-pill">{applications.length}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'jobs'}
              className={`dashboard-tab-btn ${activeTab === 'jobs' ? 'active' : ''}`}
              onClick={() => setActiveTab('jobs')}
            >
              <Briefcase size={16} aria-hidden="true" />
              <span>My Job Postings</span>
              <span className="tab-count-pill">{jobs.length}</span>
            </button>
          </div>
        </div>

        {/* TAB 1: APPLICANT PIPELINE */}
        {activeTab === 'pipeline' && (
          <div className="pipeline-view-section">
            {/* Pipeline Controls Bar */}
            <div className="pipeline-controls-card">
              <div className="pipeline-filter-row">
                {/* Job Filter Dropdown */}
                <div className="control-select-box">
                  <label htmlFor="pipeline-job-select" className="control-label">
                    Filter by Position:
                  </label>
                  <select
                    id="pipeline-job-select"
                    className="form-select control-select"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                  >
                    <option value="all">All Jobs ({jobs.length} total)</option>
                    {jobs.map((j) => (
                      <option key={j._id} value={j._id}>
                        {j.title} ({j.applicantCount || 0} applicants)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Candidate Search */}
                <div className="control-search-box">
                  <label htmlFor="candidate-search-input" className="control-label">
                    Search Candidates:
                  </label>
                  <div className="search-input-wrapper">
                    <Search size={16} className="search-icon-left" />
                    <input
                      id="candidate-search-input"
                      type="text"
                      className="form-input search-input"
                      placeholder="Filter by name, skill, or headline..."
                      value={candidateQuery}
                      onChange={(e) => setCandidateQuery(e.target.value)}
                    />
                    {candidateQuery && (
                      <button
                        type="button"
                        className="clear-search-btn"
                        onClick={() => setCandidateQuery('')}
                        aria-label="Clear candidate search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Stage Filter Chips */}
              <div className="stage-filter-chips">
                <span className="stage-filter-label">Application Stage:</span>
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
            {loadingApplications ? (
              <div className="dashboard-loading-state" aria-busy="true">
                <Loader2 size={36} className="spinner text-primary" />
                <p>Loading candidate applicants...</p>
              </div>
            ) : applicationsError ? (
              <div className="dashboard-error-state">
                <AlertCircle size={36} className="text-red-500" />
                <h3>Failed to load applicants</h3>
                <p>{applicationsError}</p>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => loadApplications(selectedJobId, selectedStage)}
                >
                  <RotateCcw size={16} />
                  <span>Retry</span>
                </button>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="dashboard-empty-state">
                <Users size={44} className="text-muted" />
                <h3>No applicants found</h3>
                <p>
                  {selectedJobId !== 'all'
                    ? 'No candidates have submitted an application for this vacancy yet.'
                    : candidateQuery
                    ? 'No candidates match your search query.'
                    : 'There are currently no candidate applications in this stage.'}
                </p>
                {candidateQuery && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => {
                      setCandidateQuery('');
                      setSelectedStage('all');
                    }}
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="applicants-cards-list">
                {filteredApplications.map((app) => {
                  const candidate = app.candidate || {};
                  const candidateName = candidate.name || 'Candidate';
                  const candidateEmail = candidate.email || 'N/A';
                  const candidateHeadline = candidate.profile?.headline || 'Job Seeker';
                  const candidateLocation = candidate.profile?.location || 'India';
                  const candidatePhone = candidate.profile?.phone;
                  const skills = candidate.skills || [];
                  const jobTitle = app.job?.title || 'Job Opening';
                  const companyName = app.job?.company || 'Company';
                  const notesCount = app.recruiterNotes?.length || 0;
                  const avatarUrl = candidate.profile?.avatarUrl;
                  const resolvedAvatar = avatarUrl ? resolveAvatarUrl(avatarUrl) : '';
                  const initials = getUserInitials(candidateName);

                  return (
                    <article key={app._id} className="applicant-pipeline-card">
                      <div className="applicant-card-header">
                        <div className="applicant-profile-group">
                          <div className="applicant-avatar-box">
                            {resolvedAvatar ? (
                              <img
                                src={resolvedAvatar}
                                alt={candidateName}
                                className="applicant-avatar-img"
                              />
                            ) : (
                              <span className="applicant-avatar-initials">{initials}</span>
                            )}
                          </div>

                          <div className="applicant-meta-copy">
                            <div className="applicant-name-row">
                              <h3 className="applicant-name">{candidateName}</h3>
                              <span className="applicant-applied-time">
                                <Calendar size={13} aria-hidden="true" />
                                Applied {formatRelativeTime(app.createdAt)}
                              </span>
                            </div>
                            <div className="applicant-headline">{candidateHeadline}</div>
                            <div className="applicant-contact-meta">
                              <span className="contact-item">
                                <MapPin size={13} aria-hidden="true" /> {candidateLocation}
                              </span>
                              <span className="contact-item">
                                <Users size={13} aria-hidden="true" /> {candidateEmail}
                              </span>
                              {candidatePhone && (
                                <span className="contact-item">{candidatePhone}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Position Applied Badge */}
                        <div className="applied-position-tag">
                          <span className="tag-label">Applied for:</span>
                          <span className="tag-job-title">{jobTitle}</span>
                        </div>
                      </div>

                      {/* Applicant Skills Pill Row */}
                      {skills.length > 0 && (
                        <div className="applicant-skills-bar">
                          <span className="skills-bar-label">Skills:</span>
                          <div className="skills-pills-wrap">
                            {skills.slice(0, 7).map((skill, i) => (
                              <span key={i} className="skill-pill-sm">
                                {skill}
                              </span>
                            ))}
                            {skills.length > 7 && (
                              <span className="skill-pill-sm skill-more-pill">
                                +{skills.length - 7} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cover Letter Note Preview */}
                      {app.coverLetter && (
                        <div className="applicant-cover-snippet">
                          <span className="cover-snippet-label">Candidate Note:</span>
                          <p className="cover-snippet-text">"{app.coverLetter}"</p>
                        </div>
                      )}

                      {/* Applicant Card Footer / Action Bar */}
                      <div className="applicant-card-footer">
                        {/* Stage Transition Control */}
                        <div className="stage-control-group">
                          <label htmlFor={`stage-select-${app._id}`} className="stage-select-label">
                            Hiring Stage:
                          </label>
                          <div className="stage-select-wrapper">
                            <select
                              id={`stage-select-${app._id}`}
                              className={`stage-select-input stage-badge-${app.status}`}
                              value={app.status}
                              disabled={updatingStatusId === app._id}
                              onChange={(e) => handleStatusChange(app._id, e.target.value)}
                            >
                              <option value="submitted">Submitted</option>
                              <option value="under_review">Under Review</option>
                              <option value="shortlisted">Shortlisted</option>
                              <option value="interview_scheduled">Interview Scheduled</option>
                              <option value="accepted">Accepted</option>
                              <option value="rejected">Rejected</option>
                            </select>
                            {updatingStatusId === app._id && (
                              <Loader2 size={14} className="spinner select-spinner" />
                            )}
                          </div>
                        </div>

                        {/* Actions: Resume & Notes */}
                        <div className="applicant-actions-group">
                          <button
                            type="button"
                            className="btn btn-outline btn-resume-download touch-target"
                            disabled={downloadingResumeId === app._id}
                            onClick={() => handleDownloadResume(app._id, candidateName)}
                            title="Download applicant resume securely"
                          >
                            {downloadingResumeId === app._id ? (
                              <>
                                <Loader2 size={15} className="spinner" />
                                <span>Downloading...</span>
                              </>
                            ) : (
                              <>
                                <Download size={15} />
                                <span>Resume</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-notes-action touch-target"
                            onClick={() => {
                              setNotesModalApp(app);
                              setNewNoteText('');
                              setNoteError('');
                            }}
                          >
                            <MessageSquare size={15} />
                            <span>Notes</span>
                            {notesCount > 0 && (
                              <span className="notes-count-badge">{notesCount}</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY JOB POSTINGS */}
        {activeTab === 'jobs' && (
          <div className="jobs-management-section">
            <div className="jobs-management-header">
              <div className="management-header-text">
                <h2>Your Job Listings ({jobs.length})</h2>
                <p>Manage vacancy publication status and review candidate volume.</p>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setIsPostJobOpen(true)}
              >
                <PlusCircle size={16} />
                <span>Post Job</span>
              </button>
            </div>

            {loadingJobs ? (
              <div className="dashboard-loading-state" aria-busy="true">
                <Loader2 size={36} className="spinner text-primary" />
                <p>Loading your job listings...</p>
              </div>
            ) : jobsError ? (
              <div className="dashboard-error-state">
                <AlertCircle size={36} className="text-red-500" />
                <h3>Error loading jobs</h3>
                <p>{jobsError}</p>
                <button type="button" className="btn btn-outline" onClick={loadRecruiterJobs}>
                  <RotateCcw size={16} />
                  <span>Retry</span>
                </button>
              </div>
            ) : jobs.length === 0 ? (
              <div className="dashboard-empty-state">
                <Briefcase size={44} className="text-muted" />
                <h3>No jobs posted yet</h3>
                <p>Create your first job listing to start receiving candidate applications.</p>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setIsPostJobOpen(true)}
                >
                  <PlusCircle size={16} />
                  <span>Post Your First Job</span>
                </button>
              </div>
            ) : (
              <div className="recruiter-jobs-table-card">
                <div className="jobs-table-responsive">
                  <table className="recruiter-jobs-table">
                    <thead>
                      <tr>
                        <th>Job Title & Details</th>
                        <th>Location & Type</th>
                        <th>Compensation (₹)</th>
                        <th>Status</th>
                        <th>Applicants</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.map((job) => (
                        <tr key={job._id}>
                          <td>
                            <div className="table-job-title">{job.title}</div>
                            <div className="table-job-dept">
                              {job.department || job.category || 'General'}
                            </div>
                            <div className="table-job-date">
                              Posted {formatRelativeTime(job.createdAt)}
                            </div>
                          </td>
                          <td>
                            <div className="table-meta-row">
                              <MapPin size={13} aria-hidden="true" />
                              <span>{job.location}</span>
                            </div>
                            <div className="table-meta-sub">
                              {job.workplaceType || 'on-site'} • {job.employmentType}
                            </div>
                          </td>
                          <td>
                            <div className="table-salary-text">
                              {formatSalary(job.salaryRange)}
                            </div>
                          </td>
                          <td>
                            <select
                              className={`job-status-select status-${job.status}`}
                              value={job.status}
                              disabled={updatingJobStatusId === job._id}
                              onChange={(e) => handleJobStatusChange(job._id, e.target.value)}
                            >
                              <option value="published">Published</option>
                              <option value="draft">Draft</option>
                              <option value="closed">Closed</option>
                            </select>
                          </td>
                          <td>
                            <span className="table-applicant-pill">
                              <Users size={13} aria-hidden="true" />
                              <strong>{job.applicantCount || 0}</strong> applicants
                            </span>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm btn-view-applicants touch-target"
                              onClick={() => handleViewJobApplicants(job._id)}
                            >
                              <span>View Applicants</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recruiter Evaluation Notes Modal */}
      {notesModalApp && (
        <div
          className="modal-overlay"
          onClick={() => setNotesModalApp(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-modal-title"
        >
          <div className="modal-container notes-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="modal-pre-title">Confidential Recruiter Notes</div>
                <h2 id="notes-modal-title" className="modal-title">
                  {notesModalApp.candidate?.name || 'Candidate'}
                </h2>
                <div className="modal-job-meta">
                  <span>Position: {notesModalApp.job?.title || 'Job Opening'}</span>
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setNotesModalApp(null)}
                aria-label="Close notes dialog"
              >
                <X size={20} />
              </button>
            </div>

            <div className="notes-modal-body">
              {/* Existing Notes History */}
              <div className="notes-history-section">
                <h4 className="notes-section-title">
                  Evaluation History ({notesModalApp.recruiterNotes?.length || 0})
                </h4>

                {(!notesModalApp.recruiterNotes || notesModalApp.recruiterNotes.length === 0) ? (
                  <p className="no-notes-text">
                    No notes added yet. Add private evaluation feedback below for your team.
                  </p>
                ) : (
                  <div className="notes-cards-stack">
                    {notesModalApp.recruiterNotes.map((n, idx) => (
                      <div key={idx} className="note-history-card">
                        <div className="note-header-row">
                          <span className="note-author">Recruiter Evaluation</span>
                          <span className="note-timestamp">
                            {formatIndianDate(n.createdAt)} • {formatRelativeTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="note-body-text">{n.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="add-note-form">
                <label htmlFor="new-note-textarea" className="form-label">
                  Add Private Evaluation Note
                </label>
                <textarea
                  id="new-note-textarea"
                  rows={3}
                  className="form-textarea"
                  placeholder="Record interview impressions, technical strengths, compensation discussions, or recommendations..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  maxLength={3000}
                />
                <div className="note-form-footer">
                  <span className="char-count">{newNoteText.length} / 3000 characters</span>
                  {noteError && <span className="text-red-500 text-xs">{noteError}</span>}
                  <button
                    type="submit"
                    className="btn btn-primary btn-save-note touch-target"
                    disabled={savingNote || !newNoteText.trim()}
                  >
                    {savingNote ? (
                      <>
                        <Loader2 size={15} className="spinner" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Send size={15} />
                        <span>Save Note</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Post a Job Modal */}
      <PostJobModal
        isOpen={isPostJobOpen}
        onClose={() => setIsPostJobOpen(false)}
        onJobCreated={() => {
          loadRecruiterJobs();
          showFeedback('New job posting created successfully.');
        }}
      />
    </div>
  );
}

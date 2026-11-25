import React, { useState, useEffect } from 'react';
import {
  X,
  Briefcase,
  Building2,
  MapPin,
  IndianRupee,
  Layers,
  Sparkles,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createJobListing } from '../services/jobService';
import { INDIAN_CITIES } from '../utils/jobFormatters';

const POPULAR_SKILL_SUGGESTIONS = [
  'React',
  'Node.js',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Spring Boot',
  'MongoDB',
  'PostgreSQL',
  'AWS',
  'Docker',
  'Kubernetes',
  'SQL',
  'Git',
  'UI/UX',
  'Figma',
  'REST APIs',
  'GraphQL',
];

const CATEGORY_OPTIONS = [
  { id: 'engineering', name: 'Software Engineering' },
  { id: 'ai-data', name: 'Data Science & AI' },
  { id: 'cloud-devops', name: 'Cloud & DevOps' },
  { id: 'design', name: 'UI/UX & Product Design' },
  { id: 'product', name: 'Product & Project Mgmt' },
  { id: 'security', name: 'Cybersecurity & Compliance' },
  { id: 'marketing', name: 'Growth & Digital Marketing' },
  { id: 'people-hr', name: 'Talent Acquisition & HR' },
];

export default function PostJobModal({ isOpen, onClose, onJobCreated }) {
  const { user, isRecruiter, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: 'Bengaluru, Karnataka',
    employmentType: 'Full-time',
    workplaceType: 'hybrid',
    experienceLevel: 'entry-level',
    category: 'engineering',
    period: 'yearly',
    salaryMin: '',
    salaryMax: '',
    description: '',
    status: 'published',
  });

  const [skills, setSkills] = useState(['React', 'JavaScript']);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Pre-fill recruiter company name if available
  useEffect(() => {
    if (user?.profile?.company) {
      setFormData((prev) => ({
        ...prev,
        company: prev.company || user.profile.company,
      }));
    } else if (user?.name && !formData.company) {
      setFormData((prev) => ({
        ...prev,
        company: `${user.name}'s Company`,
      }));
    }
  }, [user]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddSkill = (skillToAdd) => {
    const trimmed = (skillToAdd || skillInput).trim();
    if (!trimmed) return;
    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills((prev) => [...prev, trimmed]);
    }
    setSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isAuthenticated) {
      setError('Please log in as a recruiter to publish job listings.');
      return;
    }

    if (!isRecruiter) {
      setError('Only authenticated recruiter accounts are authorized to publish jobs.');
      return;
    }

    if (!formData.title.trim()) {
      setError('Job title is required.');
      return;
    }

    if (!formData.company.trim()) {
      setError('Company name is required.');
      return;
    }

    if (!formData.description.trim()) {
      setError('Job description is required.');
      return;
    }

    // Process salary
    let salaryRange = undefined;
    if (formData.salaryMin || formData.salaryMax) {
      let minVal = formData.salaryMin ? Number(formData.salaryMin) : undefined;
      let maxVal = formData.salaryMax ? Number(formData.salaryMax) : undefined;

      // If yearly and entered in Lakhs (e.g. 6 to 18), convert to full rupees
      if (formData.period === 'yearly') {
        if (minVal != null && minVal < 100) minVal = minVal * 100000;
        if (maxVal != null && maxVal < 100) maxVal = maxVal * 100000;
      }

      if (minVal != null && maxVal != null && maxVal < minVal) {
        setError('Maximum salary must be greater than or equal to minimum salary.');
        return;
      }

      salaryRange = {
        min: minVal,
        max: maxVal,
        currency: 'INR',
        period: formData.period,
      };
    }

    try {
      setLoading(true);
      const payload = {
        title: formData.title.trim(),
        company: formData.company.trim(),
        location: formData.location.trim(),
        employmentType: formData.employmentType,
        workplaceType: formData.workplaceType,
        experienceLevel: formData.experienceLevel,
        category: formData.category,
        requiredSkills: skills,
        salaryRange,
        description: formData.description.trim(),
        status: formData.status,
      };

      const res = await createJobListing(payload);

      if (res && res.data) {
        setSuccess(true);
        setTimeout(() => {
          if (onJobCreated) onJobCreated(res.data);
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err.message || 'Failed to create job listing. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-container post-job-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="brand-logo-icon">
              <Briefcase size={20} className="text-white" aria-hidden="true" />
            </div>
            <div>
              <h2 className="modal-title">Publish a New Job Opening</h2>
              <p className="text-xs text-muted">Direct posting to CareerPulse India ATS</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close post job dialog"
          >
            <X size={20} />
          </button>
        </div>

        {/* Success View */}
        {success ? (
          <div className="post-job-success" role="status">
            <CheckCircle2 size={52} className="text-emerald" />
            <h3 className="text-xl font-bold mt-3">Job Listing Published!</h3>
            <p className="text-sm text-muted mt-1">
              Your opening is now live and searchable by candidates across India.
            </p>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleSubmit} className="post-job-form">
            {error && (
              <div className="auth-error-banner" role="alert">
                <AlertCircle size={18} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="form-grid">
              {/* Job Title */}
              <div className="form-group full-width">
                <label htmlFor="post-job-title">
                  Job Title <span className="text-danger">*</span>
                </label>
                <input
                  id="post-job-title"
                  type="text"
                  name="title"
                  className="form-input"
                  placeholder="e.g. Senior Frontend Developer (React / TypeScript)"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Company Name */}
              <div className="form-group">
                <label htmlFor="post-job-company">
                  Company Name <span className="text-danger">*</span>
                </label>
                <input
                  id="post-job-company"
                  type="text"
                  name="company"
                  className="form-input"
                  placeholder="e.g. Razorpay, Swiggy, or Your Startup"
                  value={formData.company}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Location */}
              <div className="form-group">
                <label htmlFor="post-job-location">
                  Location (Indian City / Remote) <span className="text-danger">*</span>
                </label>
                <input
                  id="post-job-location"
                  type="text"
                  name="location"
                  list="indian-cities-list"
                  className="form-input"
                  placeholder="e.g. Bengaluru, Karnataka"
                  value={formData.location}
                  onChange={handleChange}
                  required
                />
                <datalist id="indian-cities-list">
                  {INDIAN_CITIES.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Employment Type */}
              <div className="form-group">
                <label htmlFor="post-job-employment">Employment Type</label>
                <select
                  id="post-job-employment"
                  name="employmentType"
                  className="form-select"
                  value={formData.employmentType}
                  onChange={handleChange}
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="On-site">On-site</option>
                </select>
              </div>

              {/* Workplace Mode */}
              <div className="form-group">
                <label htmlFor="post-job-workplace">Workplace Setup</label>
                <select
                  id="post-job-workplace"
                  name="workplaceType"
                  className="form-select"
                  value={formData.workplaceType}
                  onChange={handleChange}
                >
                  <option value="hybrid">Hybrid</option>
                  <option value="on-site">On-site</option>
                  <option value="remote">Fully Remote</option>
                </select>
              </div>

              {/* Experience Level */}
              <div className="form-group">
                <label htmlFor="post-job-exp">Experience Level</label>
                <select
                  id="post-job-exp"
                  name="experienceLevel"
                  className="form-select"
                  value={formData.experienceLevel}
                  onChange={handleChange}
                >
                  <option value="fresher">Fresher (0 years / Campus)</option>
                  <option value="internship">Internship</option>
                  <option value="entry-level">Entry-Level (1-2 years)</option>
                  <option value="mid-level">Mid-Level (3-5 years)</option>
                  <option value="senior">Senior (5-8 years)</option>
                  <option value="lead">Lead / Staff (8+ years)</option>
                </select>
              </div>

              {/* Sector / Category */}
              <div className="form-group">
                <label htmlFor="post-job-category">Category</label>
                <select
                  id="post-job-category"
                  name="category"
                  className="form-select"
                  value={formData.category}
                  onChange={handleChange}
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Compensation Period */}
              <div className="form-group">
                <label htmlFor="post-job-period">Pay Period (INR ₹)</label>
                <select
                  id="post-job-period"
                  name="period"
                  className="form-select"
                  value={formData.period}
                  onChange={handleChange}
                >
                  <option value="yearly">Annual (LPA - Lakhs Per Annum)</option>
                  <option value="monthly">Monthly Salary (₹ / month)</option>
                  <option value="stipend">Internship Stipend (₹ / month)</option>
                  <option value="hourly">Hourly Rate (₹ / hr)</option>
                </select>
              </div>

              {/* Salary Range */}
              <div className="form-group">
                <label>
                  {formData.period === 'yearly'
                    ? 'Salary Range (in LPA e.g. 8 to 15)'
                    : 'Salary Range (₹ Min & Max)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    name="salaryMin"
                    className="form-input"
                    placeholder={formData.period === 'yearly' ? 'Min LPA (e.g. 6)' : 'Min ₹ (e.g. 25000)'}
                    value={formData.salaryMin}
                    onChange={handleChange}
                    min="0"
                  />
                  <span className="text-muted">–</span>
                  <input
                    type="number"
                    name="salaryMax"
                    className="form-input"
                    placeholder={formData.period === 'yearly' ? 'Max LPA (e.g. 12)' : 'Max ₹ (e.g. 50000)'}
                    value={formData.salaryMax}
                    onChange={handleChange}
                    min="0"
                  />
                </div>
              </div>

              {/* Skills Tag Manager */}
              <div className="form-group full-width">
                <label>Required Skills & Technologies</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Type a skill and click Add or press Enter (e.g. Docker, Next.js)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => handleAddSkill()}
                    disabled={!skillInput.trim()}
                  >
                    <Plus size={16} />
                    <span>Add</span>
                  </button>
                </div>

                {/* Selected Skills Chips */}
                <div className="skills-badge-list mt-2">
                  {skills.map((skill) => (
                    <span key={skill} className="skill-chip">
                      <span>{skill}</span>
                      <button
                        type="button"
                        className="skill-chip-remove"
                        onClick={() => handleRemoveSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Quick Suggestions */}
                <div className="suggested-badges mt-2">
                  {POPULAR_SKILL_SUGGESTIONS.filter(
                    (s) => !skills.some((sk) => sk.toLowerCase() === s.toLowerCase())
                  )
                    .slice(0, 8)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="suggested-chip"
                        onClick={() => handleAddSkill(s)}
                      >
                        + {s}
                      </button>
                    ))}
                </div>
              </div>

              {/* Job Description */}
              <div className="form-group full-width">
                <label htmlFor="post-job-desc">
                  Job Description & Candidate Requirements <span className="text-danger">*</span>
                </label>
                <textarea
                  id="post-job-desc"
                  name="description"
                  rows={5}
                  className="form-textarea"
                  placeholder="Outline key responsibilities, qualifications, tech stack, and what makes your team exceptional..."
                  value={formData.description}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Status */}
              <div className="form-group full-width">
                <label htmlFor="post-job-status">Publish Status</label>
                <select
                  id="post-job-status"
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleChange}
                >
                  <option value="published">Publish Immediately (Visible to all candidates)</option>
                  <option value="draft">Save as Draft (Private to your recruiter account)</option>
                </select>
              </div>
            </div>

            {/* Actions */}
            <div className="modal-actions mt-4">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    <span>Publish Job Listing</span>
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

import React, { useState } from 'react';
import {
  X,
  UploadCloud,
  CheckCircle2,
  Building2,
  MapPin,
  DollarSign,
  Briefcase,
  AlertCircle,
  FileText,
  Send,
} from 'lucide-react';

export default function ApplyModal({ job, onClose }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    portfolio: '',
    coverNote: '',
  });
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!job) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitted(true);
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
                <DollarSign size={14} aria-hidden="true" /> {job.salary}
              </span>
              <span className="modal-meta-item">
                <Briefcase size={14} aria-hidden="true" /> {job.type}
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

        {/* Prototype Banner */}
        <div className="modal-demo-notice" role="note">
          <AlertCircle size={16} className="text-amber-500 shrink-0" aria-hidden="true" />
          <span>
            <strong>Frontend Prototype:</strong> This form demonstrates the ATS job application
            flow. Backend API and database persistence will be integrated in subsequent phases.
          </span>
        </div>

        {/* Modal Body */}
        {isSubmitted ? (
          <div className="modal-success-state" role="status">
            <div className="success-icon-wrapper">
              <CheckCircle2 size={48} className="text-emerald" aria-hidden="true" />
            </div>
            <h3 className="success-title">Application Submitted!</h3>
            <p className="success-desc">
              Your profile for <strong>{job.title}</strong> at <strong>{job.company}</strong> has
              been staged in our demo ATS candidate pipeline.
            </p>
            <div className="success-details-card">
              <div>
                <strong>Candidate:</strong> {formData.fullName || 'Alex Johnson'}
              </div>
              <div>
                <strong>Email:</strong> {formData.email || 'alex@example.com'}
              </div>
              <div>
                <strong>Resume:</strong> {uploadedFileName || 'demo_resume.pdf'}
              </div>
              <div>
                <strong>Status:</strong> Under Recruiter Review
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
                  placeholder="e.g. Alex Morgan"
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
                  placeholder="alex.morgan@example.com"
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
                  placeholder="+1 (555) 000-0000"
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

            {/* Resume Upload Box */}
            <div className="form-group">
              <label className="form-label" id="resume-upload-label">
                Resume / CV (PDF, DOCX) <span className="text-required">*</span>
              </label>
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
                placeholder="Briefly highlight your experience with React, Node, or relevant skills..."
                className="form-textarea"
                value={formData.coverNote}
                onChange={handleChange}
              />
            </div>

            {/* Modal Actions */}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost touch-target" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-submit-app touch-target">
                <Send size={16} aria-hidden="true" />
                <span>Submit Application</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

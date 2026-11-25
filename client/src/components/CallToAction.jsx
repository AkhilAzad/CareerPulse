import React from 'react';
import { UserCheck, ArrowRight, Building2, Sparkles } from 'lucide-react';

export default function CallToAction({ onOpenAuth, onBrowseJobs }) {
  return (
    <section id="why-us" className="cta-section">
      <div className="section-container">
        <div className="cta-dual-grid">
          {/* Card 1: For Job Seekers */}
          <div className="cta-card cta-card-seeker">
            <div className="cta-card-badge">For Candidates</div>
            <div className="cta-icon-box seeker-icon-box">
              <UserCheck size={28} aria-hidden="true" />
            </div>
            <h3 className="cta-card-title">Ready to level up your career?</h3>
            <p className="cta-card-text">
              Create your free candidate profile, upload your resume for AI skill indexing, and
              receive direct interview requests from verified top employers.
            </p>
            <div className="cta-card-buttons">
              <button
                type="button"
                className="btn btn-primary touch-target"
                onClick={() => onOpenAuth('signup')}
              >
                <span>Create Free Profile</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-ghost touch-target"
                onClick={onBrowseJobs}
              >
                <span>Browse All Jobs</span>
              </button>
            </div>
          </div>

          {/* Card 2: For Employers */}
          <div className="cta-card cta-card-employer">
            <div className="cta-card-badge">For Employers & Recruiters</div>
            <div className="cta-icon-box employer-icon-box">
              <Building2 size={28} aria-hidden="true" />
            </div>
            <h3 className="cta-card-title">Hiring exceptional tech talent?</h3>
            <p className="cta-card-text">
              Connect directly with verified talent across India using our integrated applicant tracking system,
              structured hiring stages, and one-click interview scheduling.
            </p>
            <div className="cta-card-buttons">
              <button
                type="button"
                className="btn btn-emerald touch-target"
                onClick={() => onOpenAuth('post-job')}
              >
                <Sparkles size={16} aria-hidden="true" />
                <span>Post a Job in 3 Mins</span>
              </button>
              <button
                type="button"
                className="btn btn-ghost touch-target"
                onClick={() => onOpenAuth('login')}
              >
                <span>Recruiter Portal</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import React from 'react';
import {
  Sparkles,
  Send,
  LineChart,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Award,
} from 'lucide-react';
import { ATS_FEATURES } from '../data/mockData';

const iconMap = {
  Sparkles: Sparkles,
  Send: Send,
  LineChart: LineChart,
  ShieldCheck: ShieldCheck,
};

export default function PlatformFeatures() {
  return (
    <section id="ats-features" className="features-section">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header text-center">
          <div className="section-badge">Integrated ATS & Portal</div>
          <h2 className="section-title">
            Engineered for Modern Job Seekers and High-Growth Teams
          </h2>
          <p className="section-subtitle">
            Say goodbye to endless repetitive forms and black-hole applications. Experience a
            transparent hiring ecosystem with real-time feedback loops.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="features-grid">
          {ATS_FEATURES.map((feature) => {
            const Icon = iconMap[feature.iconName] || Sparkles;
            return (
              <div key={feature.id} className="feature-card">
                <div className="feature-card-header">
                  <div className="feature-icon-wrapper">
                    <Icon size={24} className="feature-icon" aria-hidden="true" />
                  </div>
                  <span className="feature-badge-pill">{feature.badge}</span>
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* ATS Timeline Demonstration Card */}
        <div className="ats-preview-card">
          <div className="ats-preview-content">
            <span className="ats-mini-tag">ATS Candidate Pipeline</span>
            <h3 className="ats-preview-title">Real-Time Application Status Transparency</h3>
            <p className="ats-preview-desc">
              Candidates can monitor every stage of their job submission with automated ATS status
              updates. Never wonder whether a recruiter opened your resume.
            </p>
            <div className="ats-milestones-row">
              <div className="milestone-item milestone-done">
                <div className="milestone-circle">
                  <CheckCircle2 size={16} />
                </div>
                <span className="milestone-label">Applied</span>
                <span className="milestone-sub">Instant</span>
              </div>
              <div className="milestone-line milestone-line-done" />
              <div className="milestone-item milestone-done">
                <div className="milestone-circle">
                  <CheckCircle2 size={16} />
                </div>
                <span className="milestone-label">Reviewed</span>
                <span className="milestone-sub">ATS Parsed</span>
              </div>
              <div className="milestone-line milestone-line-done" />
              <div className="milestone-item milestone-active">
                <div className="milestone-circle">
                  <Clock size={16} />
                </div>
                <span className="milestone-label">Shortlisted</span>
                <span className="milestone-sub">Recruiter View</span>
              </div>
              <div className="milestone-line" />
              <div className="milestone-item">
                <div className="milestone-circle">
                  <Award size={16} />
                </div>
                <span className="milestone-label">Interview</span>
                <span className="milestone-sub">Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

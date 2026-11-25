import React from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  IndianRupee,
  ShieldCheck,
  Building2,
} from 'lucide-react';
import { INDIAN_CITIES } from '../utils/jobFormatters';
import { FEATURED_INDIAN_HUBS } from '../data/mockData';

const POPULAR_TAGS = [
  'React Developer',
  'Bengaluru',
  'Fresher / Intern',
  'Full-Stack Node.js',
  'Java / Spring',
  'Remote India',
  'Hyderabad',
  'Pune',
];

export default function Hero({
  searchQuery,
  setSearchQuery,
  locationQuery,
  setLocationQuery,
  jobTypeFilter,
  setJobTypeFilter,
  onSearchSubmit,
  onSelectTag,
  totalJobsCount = 0,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSearchSubmit();
  };

  return (
    <section id="hero" className="hero-section">
      <div className="hero-backdrop-glow" aria-hidden="true" />
      <div className="hero-container">
        {/* Top Announcement Pill */}
        <div className="hero-pill-badge">
          <Sparkles size={16} className="pill-badge-icon" aria-hidden="true" />
          <span className="pill-badge-text">India's Modern Tech Job Portal & Applicant Tracking System</span>
        </div>

        {/* Hero Heading & Subtitle */}
        <h1 className="hero-title">
          Find Your Next Career Move & <span className="gradient-text">Land High-Impact Roles in India</span>
        </h1>
        <p className="hero-subtitle">
          Explore genuine openings across Bengaluru, Hyderabad, Pune, Mumbai, Delhi-NCR, and remote Indian hubs.
          Transparent salary bands in INR (₹) and LPA, one-click easy apply, and direct ATS tracking.
        </p>

        {/* Search Bar Form */}
        <form className="hero-search-bar" onSubmit={handleSubmit} role="search" aria-label="Job Search">
          {/* Keyword Field */}
          <div className="search-field">
            <Search className="field-icon" size={20} aria-hidden="true" />
            <div className="field-input-wrapper">
              <label htmlFor="search-keyword" className="field-label">
                Job Title or Skill
              </label>
              <input
                id="search-keyword"
                type="text"
                className="field-input"
                placeholder="e.g. React Developer, Java, DevOps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="search-divider" aria-hidden="true" />

          {/* Location Field with Indian Cities list */}
          <div className="search-field">
            <MapPin className="field-icon" size={20} aria-hidden="true" />
            <div className="field-input-wrapper">
              <label htmlFor="search-location" className="field-label">
                Indian City or Remote
              </label>
              <input
                id="search-location"
                type="text"
                list="hero-indian-cities"
                className="field-input"
                placeholder="e.g. Bengaluru, Pune, or Remote"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
              <datalist id="hero-indian-cities">
                {INDIAN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="search-divider" aria-hidden="true" />

          {/* Job Type Dropdown */}
          <div className="search-field">
            <Briefcase className="field-icon" size={20} aria-hidden="true" />
            <div className="field-input-wrapper">
              <label htmlFor="search-type" className="field-label">
                Employment Type
              </label>
              <select
                id="search-type"
                className="field-select"
                value={jobTypeFilter}
                onChange={(e) => setJobTypeFilter(e.target.value)}
                aria-label="Filter by Job Type"
              >
                <option value="All">All Types</option>
                <option value="Full-time">Full-time</option>
                <option value="Internship">Internship</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
                <option value="On-site">On-site</option>
                <option value="Contract">Contract</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn btn-search-submit">
            <Search size={18} aria-hidden="true" />
            <span>Search Jobs</span>
          </button>
        </form>

        {/* Popular Search Tags */}
        <div className="popular-tags-container">
          <span className="popular-tags-label">Popular in India:</span>
          <div className="popular-tags-list" role="list">
            {POPULAR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                className="popular-tag-btn"
                onClick={() => onSelectTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Real Platform Capability Highlights (Zero Fabricated Metrics) */}
        <div className="hero-stats-grid">
          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Briefcase size={22} className="stat-icon" aria-hidden="true" />
            </div>
            <div className="stat-content">
              <div className="stat-value">{totalJobsCount}</div>
              <div className="stat-label">Live Verified Roles</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <IndianRupee size={22} className="stat-icon" aria-hidden="true" />
            </div>
            <div className="stat-content">
              <div className="stat-value">INR (₹) & LPA</div>
              <div className="stat-label">Transparent Pay Bands</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <Building2 size={22} className="stat-icon" aria-hidden="true" />
            </div>
            <div className="stat-content">
              <div className="stat-value">Direct ATS</div>
              <div className="stat-label">Verified Recruiter Postings</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon-wrapper">
              <ShieldCheck size={22} className="stat-icon" aria-hidden="true" />
            </div>
            <div className="stat-content">
              <div className="stat-value">100% Free</div>
              <div className="stat-label">For Candidates</div>
            </div>
          </div>
        </div>

        {/* Featured Indian Tech Hubs */}
        <div className="trusted-by-section">
          <p className="trusted-by-text">Explore opportunities across major Indian hubs</p>
          <div className="trusted-companies-list">
            {FEATURED_INDIAN_HUBS.map((hub, index) => (
              <button
                key={index}
                type="button"
                className="trusted-company-item cursor-pointer"
                onClick={() => onSelectTag(hub)}
                title={`Filter jobs in ${hub}`}
              >
                <MapPin size={13} className="text-primary mr-1" aria-hidden="true" />
                <span className="company-name-text">{hub}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

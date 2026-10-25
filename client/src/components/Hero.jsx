import React from 'react';
import {
  Search,
  MapPin,
  Briefcase,
  Sparkles,
  Building2,
  CheckCircle2,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { PLATFORM_STATS, TRUSTED_COMPANIES } from '../data/mockData';

const POPULAR_TAGS = [
  'React Developer',
  'Remote',
  'UI/UX Designer',
  'DevOps',
  'Product Manager',
  'AI / Python',
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
          <span className="pill-badge-text">Next-Gen Job Portal & Applicant Tracking System</span>
        </div>

        {/* Hero Heading & Subtitle */}
        <h1 className="hero-title">
          Find Your Next Career Move & <span className="gradient-text">Land High-Impact Roles</span>
        </h1>
        <p className="hero-subtitle">
          Connect with 4,200+ industry-leading teams. Explore verified high-paying roles with
          transparent salary bands, one-click easy apply, and end-to-end application tracking.
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
                placeholder="e.g. React Developer, Designer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="search-divider" aria-hidden="true" />

          {/* Location Field */}
          <div className="search-field">
            <MapPin className="field-icon" size={20} aria-hidden="true" />
            <div className="field-input-wrapper">
              <label htmlFor="search-location" className="field-label">
                Location
              </label>
              <input
                id="search-location"
                type="text"
                className="field-input"
                placeholder="City, State, or 'Remote'"
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="search-divider" aria-hidden="true" />

          {/* Job Type Dropdown */}
          <div className="search-field">
            <Briefcase className="field-icon" size={20} aria-hidden="true" />
            <div className="field-input-wrapper">
              <label htmlFor="search-type" className="field-label">
                Job Type
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
                <option value="Remote">Remote</option>
                <option value="Contract">Contract</option>
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
          <span className="popular-tags-label">Trending searches:</span>
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

        {/* Platform Metric Stats */}
        <div className="hero-stats-grid">
          {PLATFORM_STATS.map((stat, idx) => {
            const icons = {
              Briefcase: <Briefcase size={22} className="stat-icon" aria-hidden="true" />,
              Building2: <Building2 size={22} className="stat-icon" aria-hidden="true" />,
              CheckCircle2: <CheckCircle2 size={22} className="stat-icon" aria-hidden="true" />,
              DollarSign: <DollarSign size={22} className="stat-icon" aria-hidden="true" />,
            };
            return (
              <div key={idx} className="stat-card">
                <div className="stat-icon-wrapper">{icons[stat.icon] || <TrendingUp size={22} aria-hidden="true" />}</div>
                <div className="stat-content">
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trusted Companies Bar */}
        <div className="trusted-by-section">
          <p className="trusted-by-text">Leading tech companies hiring on CareerPulse</p>
          <div className="trusted-companies-list">
            {TRUSTED_COMPANIES.map((company, index) => (
              <div key={index} className="trusted-company-item">
                <span className="company-logo-dot" aria-hidden="true" />
                <span className="company-name-text">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

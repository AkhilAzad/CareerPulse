import React from 'react';
import {
  RotateCcw,
  Sparkles,
  SearchX,
} from 'lucide-react';
import JobCard from './JobCard';

export default function FeaturedJobs({
  jobs,
  totalJobsCount,
  activeFilterTab,
  setActiveFilterTab,
  selectedCategory,
  onResetCategory,
  searchQuery,
  locationQuery,
  jobTypeFilter,
  onResetAllFilters,
  onApplyJob,
  savedJobIds,
  onToggleSave,
}) {
  const tabs = [
    { id: 'all', label: 'All Jobs' },
    { id: 'full-time', label: 'Full-time' },
    { id: 'remote', label: 'Remote' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'design', label: 'Design' },
    { id: 'saved', label: `Saved (${savedJobIds.length})` },
  ];

  const hasActiveFilters =
    searchQuery ||
    locationQuery ||
    jobTypeFilter !== 'All' ||
    selectedCategory !== 'all' ||
    activeFilterTab !== 'all';

  return (
    <section id="featured-jobs" className="featured-jobs-section">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-row">
          <div className="section-header-text">
            <div className="section-badge">Verified Positions</div>
            <h2 className="section-title">Featured Job Openings</h2>
            <p className="section-subtitle">
              Hand-curated, high-impact opportunities from fast-scaling startups and Fortune 500
              employers.
            </p>
          </div>

          <div className="jobs-count-pill" aria-live="polite">
            <Sparkles size={14} className="text-primary" aria-hidden="true" />
            <span>
              Showing <strong>{jobs.length}</strong> of {totalJobsCount} verified roles
            </span>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="jobs-filters-bar">
          <div className="filter-tabs-list" role="tablist" aria-label="Job Filters">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeFilterTab === tab.id}
                className={`filter-tab-btn ${
                  activeFilterTab === tab.id ? 'filter-tab-active' : ''
                }`}
                onClick={() => setActiveFilterTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              className="btn btn-reset-filters"
              onClick={onResetAllFilters}
              title="Reset all active search and category filters"
              aria-label="Reset all filters"
            >
              <RotateCcw size={14} aria-hidden="true" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Active Filter Chips / Notice */}
        {hasActiveFilters && (
          <div className="active-filters-summary">
            <span className="summary-label">Active filters:</span>
            {searchQuery && (
              <span className="active-filter-chip">
                Keyword: "{searchQuery}"
              </span>
            )}
            {locationQuery && (
              <span className="active-filter-chip">
                Location: "{locationQuery}"
              </span>
            )}
            {jobTypeFilter !== 'All' && (
              <span className="active-filter-chip">
                Type: {jobTypeFilter}
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="active-filter-chip">
                Category: {selectedCategory}
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={onResetCategory}
                  aria-label={`Remove category filter ${selectedCategory}`}
                >
                  ×
                </button>
              </span>
            )}
            {activeFilterTab !== 'all' && (
              <span className="active-filter-chip">Tab: {activeFilterTab}</span>
            )}
          </div>
        )}

        {/* Jobs Grid or Empty State */}
        {jobs.length > 0 ? (
          <div className="jobs-grid">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={onApplyJob}
                isSaved={savedJobIds.includes(job.id)}
                onToggleSave={onToggleSave}
              />
            ))}
          </div>
        ) : (
          <div className="jobs-empty-state">
            <div className="empty-state-icon-box">
              <SearchX size={44} className="text-muted" aria-hidden="true" />
            </div>
            <h3 className="empty-state-title">No matching jobs found</h3>
            <p className="empty-state-description">
              We couldn't find any positions matching your active filters. Try searching for
              broader keywords or reset your filters.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onResetAllFilters}
            >
              <RotateCcw size={16} aria-hidden="true" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* Bottom Banner */}
        {jobs.length > 0 && (
          <div className="jobs-bottom-cta">
            <p className="bottom-cta-text">
              Looking for more specific engineering, design, or marketing positions?
            </p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                const el = document.getElementById('categories');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <span>Explore All Categories</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

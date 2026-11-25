import React from 'react';
import {
  RotateCcw,
  Sparkles,
  SearchX,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  PlusCircle,
  SlidersHorizontal,
} from 'lucide-react';
import JobCard from './JobCard';

export default function FeaturedJobs({
  jobs = [],
  totalJobsCount = 0,
  activeFilterTab = 'all',
  setActiveFilterTab,
  selectedCategory = 'all',
  onSelectCategory,
  onResetCategory,
  searchQuery = '',
  setSearchQuery,
  locationQuery = '',
  setLocationQuery,
  jobTypeFilter = 'All',
  setJobTypeFilter,
  experienceLevel = 'all',
  setExperienceLevel,
  minSalary = '',
  setMinSalary,
  workplaceType = 'all',
  setWorkplaceType,
  onResetAllFilters,
  onApplyJob,
  onViewDetails,
  savedJobIds = [],
  onToggleSave,
  appliedJobIds = [],
  isLoading = false,
  error = null,
  onRetry,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onOpenPostJob,
}) {
  const tabs = [
    { id: 'all', label: 'All Jobs' },
    { id: 'full-time', label: 'Full-time' },
    { id: 'internship', label: 'Internships' },
    { id: 'remote', label: 'Remote' },
    { id: 'engineering', label: 'Engineering' },
    { id: 'saved', label: `Saved (${savedJobIds.length})` },
  ];

  const hasActiveFilters = Boolean(
    searchQuery ||
    locationQuery ||
    jobTypeFilter !== 'All' ||
    selectedCategory !== 'all' ||
    activeFilterTab !== 'all' ||
    (experienceLevel && experienceLevel !== 'all') ||
    (minSalary && minSalary !== '') ||
    (workplaceType && workplaceType !== 'all')
  );

  return (
    <section id="featured-jobs" className="featured-jobs-section">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-row">
          <div className="section-header-text">
            <div className="section-badge">Verified Positions</div>
            <h2 className="section-title">Verified Job Openings in India</h2>
            <p className="section-subtitle">
              Direct postings with transparent INR compensation from verified recruiters and teams.
            </p>
          </div>

          <div className="jobs-count-pill" aria-live="polite">
            <Sparkles size={14} className="text-primary" aria-hidden="true" />
            <span>
              {isLoading ? (
                'Updating listings...'
              ) : (
                <>
                  Showing <strong>{jobs.length}</strong> of {totalJobsCount} openings
                </>
              )}
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
                onClick={() => {
                  setActiveFilterTab(tab.id);
                  if (onPageChange) onPageChange(1);
                }}
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

          {/* Secondary Indian Job Market Filter Dropdowns */}
          <div className="jobs-secondary-filters">
            {/* Experience Level Filter */}
            {setExperienceLevel && (
              <div className="filter-select-wrapper">
                <label htmlFor="filter-experience" className="filter-select-label">
                  Experience:
                </label>
                <select
                  id="filter-experience"
                  className="filter-dropdown-select"
                  value={experienceLevel}
                  onChange={(e) => {
                    setExperienceLevel(e.target.value);
                    if (onPageChange) onPageChange(1);
                  }}
                  aria-label="Filter by experience level"
                >
                  <option value="all">All Experience</option>
                  <option value="fresher">Fresher (0 yrs)</option>
                  <option value="internship">Internship</option>
                  <option value="entry-level">Entry-Level (0-2 yrs)</option>
                  <option value="mid-level">Mid-Level (2-5 yrs)</option>
                  <option value="senior">Senior (5+ yrs)</option>
                  <option value="lead">Lead / Principal (8+ yrs)</option>
                </select>
              </div>
            )}

            {/* Minimum Salary in LPA / INR Filter */}
            {setMinSalary && (
              <div className="filter-select-wrapper">
                <label htmlFor="filter-salary" className="filter-select-label">
                  Min Salary:
                </label>
                <select
                  id="filter-salary"
                  className="filter-dropdown-select"
                  value={minSalary}
                  onChange={(e) => {
                    setMinSalary(e.target.value);
                    if (onPageChange) onPageChange(1);
                  }}
                  aria-label="Filter by minimum salary"
                >
                  <option value="">Any Salary</option>
                  <option value="300000">₹3+ LPA</option>
                  <option value="600000">₹6+ LPA</option>
                  <option value="1000000">₹10+ LPA</option>
                  <option value="1500000">₹15+ LPA</option>
                  <option value="2500000">₹25+ LPA</option>
                </select>
              </div>
            )}

            {/* Workplace Arrangement Filter */}
            {setWorkplaceType && (
              <div className="filter-select-wrapper">
                <label htmlFor="filter-workplace" className="filter-select-label">
                  Workplace:
                </label>
                <select
                  id="filter-workplace"
                  className="filter-dropdown-select"
                  value={workplaceType}
                  onChange={(e) => {
                    setWorkplaceType(e.target.value);
                    if (onPageChange) onPageChange(1);
                  }}
                  aria-label="Filter by workplace arrangement"
                >
                  <option value="all">All Arrangements</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="on-site">On-site</option>
                </select>
              </div>
            )}

            {/* Category Dropdown */}
            {onSelectCategory && (
              <div className="filter-select-wrapper">
                <label htmlFor="filter-category" className="filter-select-label">
                  Category:
                </label>
                <select
                  id="filter-category"
                  className="filter-dropdown-select"
                  value={selectedCategory}
                  onChange={(e) => {
                    onSelectCategory(e.target.value);
                    if (onPageChange) onPageChange(1);
                  }}
                  aria-label="Filter by category"
                >
                  <option value="all">All Categories</option>
                  <option value="engineering">Software Engineering</option>
                  <option value="ai-data">Data Science & AI</option>
                  <option value="cloud-devops">Cloud & DevOps</option>
                  <option value="design">UI/UX & Product Design</option>
                  <option value="product">Product & Project Mgmt</option>
                  <option value="security">Cybersecurity</option>
                  <option value="marketing">Growth & Marketing</option>
                  <option value="people-hr">Talent Acquisition & HR</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Chips / Notice */}
        {hasActiveFilters && (
          <div className="active-filters-summary">
            <span className="summary-label">Active filters:</span>
            {searchQuery && (
              <span className="active-filter-chip">
                Keyword: "{searchQuery}"
                {setSearchQuery && (
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => {
                      setSearchQuery('');
                      if (onPageChange) onPageChange(1);
                    }}
                    aria-label="Clear keyword filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {locationQuery && (
              <span className="active-filter-chip">
                Location: "{locationQuery}"
                {setLocationQuery && (
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => {
                      setLocationQuery('');
                      if (onPageChange) onPageChange(1);
                    }}
                    aria-label="Clear location filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {jobTypeFilter !== 'All' && (
              <span className="active-filter-chip">
                Type: {jobTypeFilter}
                {setJobTypeFilter && (
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => {
                      setJobTypeFilter('All');
                      if (onPageChange) onPageChange(1);
                    }}
                    aria-label="Clear employment type filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {experienceLevel && experienceLevel !== 'all' && (
              <span className="active-filter-chip">
                Exp: {experienceLevel}
                {setExperienceLevel && (
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => {
                      setExperienceLevel('all');
                      if (onPageChange) onPageChange(1);
                    }}
                    aria-label="Clear experience level filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {minSalary && minSalary !== '' && (
              <span className="active-filter-chip">
                Min: ₹{Number(minSalary) / 100000} LPA
                {setMinSalary && (
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => {
                      setMinSalary('');
                      if (onPageChange) onPageChange(1);
                    }}
                    aria-label="Clear minimum salary filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {workplaceType && workplaceType !== 'all' && (
              <span className="active-filter-chip">
                Workplace: {workplaceType}
                {setWorkplaceType && (
                  <button
                    type="button"
                    className="chip-remove-btn"
                    onClick={() => {
                      setWorkplaceType('all');
                      if (onPageChange) onPageChange(1);
                    }}
                    aria-label="Clear workplace filter"
                  >
                    ×
                  </button>
                )}
              </span>
            )}
            {selectedCategory !== 'all' && (
              <span className="active-filter-chip">
                Category: {selectedCategory}
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={() => {
                    onResetCategory();
                    if (onPageChange) onPageChange(1);
                  }}
                  aria-label={`Remove category filter ${selectedCategory}`}
                >
                  ×
                </button>
              </span>
            )}
            {activeFilterTab !== 'all' && (
              <span className="active-filter-chip">
                Tab: {activeFilterTab}
                <button
                  type="button"
                  className="chip-remove-btn"
                  onClick={() => {
                    setActiveFilterTab('all');
                    if (onPageChange) onPageChange(1);
                  }}
                  aria-label="Reset tab to all"
                >
                  ×
                </button>
              </span>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="jobs-loading-container" role="status" aria-live="polite">
            <Loader2 size={36} className="animate-spin text-primary" aria-hidden="true" />
            <p className="loading-text">Fetching verified positions from CareerPulse API...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="jobs-error-container" role="alert">
            <AlertCircle size={40} className="text-danger shrink-0" aria-hidden="true" />
            <div className="error-content">
              <h3 className="error-title">Unable to load job listings</h3>
              <p className="error-message">{error}</p>
              {onRetry && (
                <button type="button" className="btn btn-primary btn-retry" onClick={onRetry}>
                  <RotateCcw size={15} aria-hidden="true" />
                  <span>Try Again</span>
                </button>
              )}
            </div>
          </div>
        ) : jobs.length > 0 ? (
          /* Jobs Grid */
          <>
            <div className="jobs-grid">
              {jobs.map((job) => (
                <JobCard
                  key={job._id || job.id}
                  job={job}
                  onApply={onApplyJob}
                  onViewDetails={onViewDetails}
                  isSaved={savedJobIds.includes(job._id || job.id)}
                  onToggleSave={onToggleSave}
                  hasApplied={appliedJobIds.includes(job._id || job.id)}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <nav className="jobs-pagination-bar" aria-label="Job Search Pagination">
                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => onPageChange && onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <span className="pagination-info" aria-current="page">
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  className="pagination-btn"
                  onClick={() => onPageChange && onPageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  <span>Next</span>
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            )}
          </>
        ) : hasActiveFilters ? (
          /* Empty State With Active Filters */
          <div className="jobs-empty-state">
            <div className="empty-state-icon-box">
              <SearchX size={44} className="text-muted" aria-hidden="true" />
            </div>
            <h3 className="empty-state-title">No matching jobs found</h3>
            <p className="empty-state-description">
              We couldn't find any positions matching your active filters. Try searching for
              broader keywords, choosing another location, or resetting your filters.
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
        ) : (
          /* Empty State When Database Has No Openings Yet */
          <div className="jobs-empty-state">
            <div className="empty-state-icon-box">
              <Briefcase size={44} className="text-primary" aria-hidden="true" />
            </div>
            <h3 className="empty-state-title">No Job Openings Published Yet</h3>
            <p className="empty-state-description">
              CareerPulse ATS connects verified employers and candidates across India with transparent INR salary bands and direct ATS tracking. Be the first to publish a role!
            </p>
            {onOpenPostJob && (
              <div className="empty-state-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onOpenPostJob}
                >
                  <PlusCircle size={16} aria-hidden="true" />
                  <span>Post a Job as Recruiter</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Bottom Banner */}
        {!isLoading && jobs.length > 0 && (
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

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PopularCategories from './components/PopularCategories';
import FeaturedJobs from './components/FeaturedJobs';
import PlatformFeatures from './components/PlatformFeatures';
import CallToAction from './components/CallToAction';
import Footer from './components/Footer';
import ApplyModal from './components/ApplyModal';
import AuthModal from './components/AuthModal';
import JobDetailsModal from './components/JobDetailsModal';
import ProtectedRoute from './components/ProtectedRoute';
import ProfilePage from './pages/ProfilePage';
import RecruiterDashboard from './pages/RecruiterDashboard';
import CandidateApplicationsPage from './pages/CandidateApplicationsPage';
import PostJobModal from './components/PostJobModal';
import { useAuth } from './context/AuthContext';
import { fetchJobs } from './services/jobService';
import { fetchMyApplications } from './services/applicationService';
import './App.css';

export default function App() {
  const location = useLocation();
  const { isAuthenticated, isRecruiter, isCandidate } = useAuth();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeFilterTab, setActiveFilterTab] = useState('all');
  const [experienceLevel, setExperienceLevel] = useState('all');
  const [minSalary, setMinSalary] = useState('');
  const [workplaceType, setWorkplaceType] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobsCount, setTotalJobsCount] = useState(0);

  // Live Jobs Data & Loading States
  const [jobs, setJobs] = useState([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState(null);

  // Bookmarking / Saved Jobs State
  const [savedJobIds, setSavedJobIds] = useState([]);

  // Candidate Applied Jobs Tracking
  const [appliedJobIds, setAppliedJobIds] = useState([]);

  // Modals State
  const [applyingJob, setApplyingJob] = useState(null);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);

  // Load candidate applications if authenticated
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && isCandidate) {
      fetchMyApplications({ limit: 100 })
        .then((res) => {
          if (isMounted && res?.data) {
            const ids = res.data.map((app) => app.job?._id || app.job).filter(Boolean);
            setAppliedJobIds(ids);
          }
        })
        .catch(() => {});
    } else {
      setAppliedJobIds([]);
    }
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isCandidate]);

  // Load saved jobs from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('careerpulse_saved_jobs');
      if (stored) {
        setSavedJobIds(JSON.parse(stored));
      }
    } catch (_) {}
  }, []);

  // Open auth modal if redirected with state
  useEffect(() => {
    if (location.state?.openAuth) {
      setAuthModal({ isOpen: true, mode: location.state.openAuth });
    }
  }, [location.state]);

  // Toggle Save / Bookmark
  const handleToggleSave = (jobId) => {
    setSavedJobIds((prev) => {
      const updated = prev.includes(jobId)
        ? prev.filter((id) => id !== jobId)
        : [...prev, jobId];
      try {
        localStorage.setItem('careerpulse_saved_jobs', JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Fetch Jobs from GET /api/jobs with live query parameters
  const loadJobs = useCallback(async () => {
    setIsLoadingJobs(true);
    setJobsError(null);

    try {
      // Map active filter tab or dropdown to API parameters
      let effectiveEmploymentType = jobTypeFilter !== 'All' ? jobTypeFilter : undefined;
      let effectiveCategory = selectedCategory !== 'all' ? selectedCategory : undefined;
      let effectiveWorkplace = workplaceType !== 'all' ? workplaceType : undefined;

      if (activeFilterTab === 'full-time') {
        effectiveEmploymentType = 'Full-time';
      } else if (activeFilterTab === 'internship') {
        effectiveEmploymentType = 'Internship';
      } else if (activeFilterTab === 'remote') {
        effectiveWorkplace = 'remote';
      } else if (activeFilterTab === 'engineering') {
        effectiveCategory = 'engineering';
      } else if (activeFilterTab === 'design') {
        effectiveCategory = 'design';
      }

      const params = {
        page: currentPage,
        limit: 9,
        search: searchQuery.trim() || undefined,
        location: locationQuery.trim() || undefined,
        employmentType: effectiveEmploymentType,
        workplaceType: effectiveWorkplace,
        experienceLevel: experienceLevel !== 'all' ? experienceLevel : undefined,
        minSalary: minSalary ? minSalary : undefined,
        category: effectiveCategory,
      };

      const response = await fetchJobs(params);

      if (response && Array.isArray(response.data)) {
        let fetchedJobs = response.data;

        // If tab is 'saved', filter locally against saved IDs
        if (activeFilterTab === 'saved') {
          fetchedJobs = fetchedJobs.filter((j) =>
            savedJobIds.includes(j._id || j.id)
          );
        }

        setJobs(fetchedJobs);
        setTotalJobsCount(response.total ?? fetchedJobs.length);
        setTotalPages(response.pages ?? 1);
      }
    } catch (err) {
      setJobsError(err.message || 'Unable to connect to jobs service.');
      setJobs([]);
      setTotalJobsCount(0);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [
    searchQuery,
    locationQuery,
    jobTypeFilter,
    selectedCategory,
    activeFilterTab,
    experienceLevel,
    minSalary,
    workplaceType,
    currentPage,
    savedJobIds,
  ]);

  // Trigger search on state changes
  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Handlers
  const handleSearchSubmit = () => {
    setCurrentPage(1);
    const el = document.getElementById('featured-jobs');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectTag = (tag) => {
    setSearchQuery(tag);
    setCurrentPage(1);
    handleSearchSubmit();
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    setCurrentPage(1);
    handleSearchSubmit();
  };

  const handleResetCategory = () => {
    setSelectedCategory('all');
    setCurrentPage(1);
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setJobTypeFilter('All');
    setSelectedCategory('all');
    setActiveFilterTab('all');
    setExperienceLevel('all');
    setMinSalary('');
    setWorkplaceType('all');
    setCurrentPage(1);
  };

  const handleOpenAuth = (mode = 'login') => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal({ isOpen: false, mode: 'login' });
  };

  const handleViewDetails = (job) => {
    setSelectedJobForDetails(job);
  };

  const handleCloseDetails = () => {
    setSelectedJobForDetails(null);
  };

  const handleApplyJob = (job) => {
    setApplyingJob(job);
  };

  const handleCloseApply = () => {
    setApplyingJob(null);
  };

  const handleJobApplied = (appData) => {
    const appliedId = appData?.job?._id || appData?.job || applyingJob?._id || applyingJob?.id;
    if (appliedId) {
      setAppliedJobIds((prev) => (prev.includes(appliedId) ? prev : [...prev, appliedId]));
    }
    // Refresh jobs list to immediately update live applicant count
    loadJobs();
  };

  const handleOpenPostJob = () => {
    if (!isAuthenticated) {
      handleOpenAuth('post-job');
    } else if (isRecruiter) {
      setIsPostJobOpen(true);
    } else {
      handleOpenAuth('post-job');
    }
  };

  const handleJobCreated = (newJob) => {
    loadJobs();
    if (newJob) {
      setSelectedJobForDetails(newJob);
    }
  };

  const handleBrowseJobs = () => {
    const el = document.getElementById('featured-jobs');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="job-portal-app">
      {/* Navigation Bar */}
      <Navbar
        onOpenAuth={handleOpenAuth}
        onOpenPostJob={handleOpenPostJob}
        appliedCount={appliedJobIds.length}
      />

      <main>
        <Routes>
          {/* Main Job Board Homepage Route */}
          <Route
            path="/"
            element={
              <>
                {/* Hero Section with Search */}
                <Hero
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  locationQuery={locationQuery}
                  setLocationQuery={setLocationQuery}
                  jobTypeFilter={jobTypeFilter}
                  setJobTypeFilter={setJobTypeFilter}
                  onSearchSubmit={handleSearchSubmit}
                  onSelectTag={handleSelectTag}
                  totalJobsCount={totalJobsCount}
                />

                {/* Popular Job Categories */}
                <PopularCategories
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleSelectCategory}
                />

                {/* Featured Jobs Section */}
                <FeaturedJobs
                  jobs={jobs}
                  totalJobsCount={totalJobsCount}
                  activeFilterTab={activeFilterTab}
                  setActiveFilterTab={(tab) => {
                    setActiveFilterTab(tab);
                    setCurrentPage(1);
                  }}
                  selectedCategory={selectedCategory}
                  onSelectCategory={handleSelectCategory}
                  onResetCategory={handleResetCategory}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  locationQuery={locationQuery}
                  setLocationQuery={setLocationQuery}
                  jobTypeFilter={jobTypeFilter}
                  setJobTypeFilter={setJobTypeFilter}
                  experienceLevel={experienceLevel}
                  setExperienceLevel={setExperienceLevel}
                  minSalary={minSalary}
                  setMinSalary={setMinSalary}
                  workplaceType={workplaceType}
                  setWorkplaceType={setWorkplaceType}
                  onResetAllFilters={handleResetAllFilters}
                  onApplyJob={handleApplyJob}
                  onViewDetails={handleViewDetails}
                  savedJobIds={savedJobIds}
                  onToggleSave={handleToggleSave}
                  appliedJobIds={appliedJobIds}
                  isLoading={isLoadingJobs}
                  error={jobsError}
                  onRetry={loadJobs}
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={(page) => {
                    setCurrentPage(page);
                    const el = document.getElementById('featured-jobs');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  onOpenPostJob={handleOpenPostJob}
                />

                {/* ATS & Platform Highlights */}
                <PlatformFeatures />

                {/* Dual Call to Action */}
                <CallToAction
                  onOpenAuth={handleOpenAuth}
                  onBrowseJobs={handleBrowseJobs}
                />
              </>
            }
          />

          {/* Protected Profile Dashboard Route */}
          <Route
            path="/profile"
            element={
              <ProtectedRoute onRequireAuth={handleOpenAuth}>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* Protected Candidate Application Tracking Route */}
          <Route
            path="/applications"
            element={
              <ProtectedRoute allowedRoles={['candidate']} onRequireAuth={handleOpenAuth}>
                <CandidateApplicationsPage onViewJobDetails={handleViewDetails} />
              </ProtectedRoute>
            }
          />

          {/* Protected Recruiter ATS Dashboard Route */}
          <Route
            path="/recruiter/dashboard"
            element={
              <ProtectedRoute allowedRoles={['recruiter', 'admin']} onRequireAuth={handleOpenAuth}>
                <RecruiterDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <Footer />

      {/* Quick Apply Modal */}
      {applyingJob && (
        <ApplyModal
          job={applyingJob}
          onClose={handleCloseApply}
          onApplied={handleJobApplied}
          onOpenAuth={handleOpenAuth}
        />
      )}

      {/* Job Details Modal */}
      {selectedJobForDetails && (
        <JobDetailsModal
          jobId={selectedJobForDetails._id || selectedJobForDetails.id}
          initialJob={selectedJobForDetails}
          onClose={handleCloseDetails}
          onApply={handleApplyJob}
          isSaved={savedJobIds.includes(
            selectedJobForDetails._id || selectedJobForDetails.id
          )}
          onToggleSave={handleToggleSave}
          hasApplied={appliedJobIds.includes(
            selectedJobForDetails._id || selectedJobForDetails.id
          )}
        />
      )}

      {/* Post a Job Recruiter Modal */}
      <PostJobModal
        isOpen={isPostJobOpen}
        onClose={() => setIsPostJobOpen(false)}
        onJobCreated={handleJobCreated}
      />

      {/* Authentication Modal */}
      {authModal.isOpen && (
        <AuthModal
          initialMode={authModal.mode}
          onClose={handleCloseAuth}
        />
      )}
    </div>
  );
}

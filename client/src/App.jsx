import React, { useState, useMemo } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import PopularCategories from './components/PopularCategories';
import FeaturedJobs from './components/FeaturedJobs';
import PlatformFeatures from './components/PlatformFeatures';
import CallToAction from './components/CallToAction';
import Footer from './components/Footer';
import ApplyModal from './components/ApplyModal';
import AuthModal from './components/AuthModal';
import { FEATURED_JOBS } from './data/mockData';
import './App.css';

export default function App() {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [jobTypeFilter, setJobTypeFilter] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeFilterTab, setActiveFilterTab] = useState('all');

  // Bookmarking / Saved Jobs State
  const [savedJobIds, setSavedJobIds] = useState(['job-1', 'job-3']);

  // Modals State
  const [applyingJob, setApplyingJob] = useState(null);
  const [authModal, setAuthModal] = useState({ isOpen: false, mode: 'login' });

  // Toggle Save / Bookmark
  const handleToggleSave = (jobId) => {
    setSavedJobIds((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  };

  // Filter Jobs computation
  const filteredJobs = useMemo(() => {
    return FEATURED_JOBS.filter((job) => {
      // 1. Keyword search (title, company, description, tags)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesTitle = job.title.toLowerCase().includes(query);
        const matchesCompany = job.company.toLowerCase().includes(query);
        const matchesDesc = job.description.toLowerCase().includes(query);
        const matchesTags = job.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matchesTitle && !matchesCompany && !matchesDesc && !matchesTags) {
          return false;
        }
      }

      // 2. Location filter
      if (locationQuery.trim()) {
        const loc = locationQuery.toLowerCase().trim();
        const matchesLoc = job.location.toLowerCase().includes(loc);
        if (!matchesLoc) return false;
      }

      // 3. Dropdown Job Type filter
      if (jobTypeFilter !== 'All') {
        if (jobTypeFilter === 'Remote') {
          const isRemote =
            job.type === 'Remote' || job.location.toLowerCase().includes('remote');
          if (!isRemote) return false;
        } else if (job.type !== jobTypeFilter) {
          return false;
        }
      }

      // 4. Category filter (from PopularCategories click)
      if (selectedCategory !== 'all') {
        if (job.category !== selectedCategory) return false;
      }

      // 5. Active Tab filter
      if (activeFilterTab === 'full-time') {
        if (job.type !== 'Full-time') return false;
      } else if (activeFilterTab === 'remote') {
        const isRemote =
          job.type === 'Remote' || job.location.toLowerCase().includes('remote');
        if (!isRemote) return false;
      } else if (activeFilterTab === 'engineering') {
        if (job.category !== 'engineering' && job.category !== 'cloud-devops') {
          return false;
        }
      } else if (activeFilterTab === 'design') {
        if (job.category !== 'design') return false;
      } else if (activeFilterTab === 'saved') {
        if (!savedJobIds.includes(job.id)) return false;
      }

      return true;
    });
  }, [
    searchQuery,
    locationQuery,
    jobTypeFilter,
    selectedCategory,
    activeFilterTab,
    savedJobIds,
  ]);

  // Handlers
  const handleSearchSubmit = () => {
    const el = document.getElementById('featured-jobs');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectTag = (tag) => {
    setSearchQuery(tag);
    handleSearchSubmit();
  };

  const handleSelectCategory = (catId) => {
    setSelectedCategory(catId);
    handleSearchSubmit();
  };

  const handleResetCategory = () => {
    setSelectedCategory('all');
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setLocationQuery('');
    setJobTypeFilter('All');
    setSelectedCategory('all');
    setActiveFilterTab('all');
  };

  const handleOpenAuth = (mode = 'login') => {
    setAuthModal({ isOpen: true, mode });
  };

  const handleCloseAuth = () => {
    setAuthModal({ isOpen: false, mode: 'login' });
  };

  const handleApplyJob = (job) => {
    setApplyingJob(job);
  };

  const handleCloseApply = () => {
    setApplyingJob(null);
  };

  const handleBrowseJobs = () => {
    const el = document.getElementById('featured-jobs');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="job-portal-app">
      {/* Navigation Bar */}
      <Navbar onOpenAuth={handleOpenAuth} />

      <main>
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
        />

        {/* Popular Job Categories */}
        <PopularCategories
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
        />

        {/* Featured Jobs Section */}
        <FeaturedJobs
          jobs={filteredJobs}
          totalJobsCount={FEATURED_JOBS.length}
          activeFilterTab={activeFilterTab}
          setActiveFilterTab={setActiveFilterTab}
          selectedCategory={selectedCategory}
          onResetCategory={handleResetCategory}
          searchQuery={searchQuery}
          locationQuery={locationQuery}
          jobTypeFilter={jobTypeFilter}
          onResetAllFilters={handleResetAllFilters}
          onApplyJob={handleApplyJob}
          savedJobIds={savedJobIds}
          onToggleSave={handleToggleSave}
        />

        {/* ATS & Platform Highlights */}
        <PlatformFeatures />

        {/* Dual Call to Action */}
        <CallToAction
          onOpenAuth={handleOpenAuth}
          onBrowseJobs={handleBrowseJobs}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Quick Apply Modal */}
      {applyingJob && (
        <ApplyModal job={applyingJob} onClose={handleCloseApply} />
      )}

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

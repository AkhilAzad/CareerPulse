import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Briefcase, Menu, X, PlusCircle, ArrowRight, LogOut, User, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { resolveAvatarUrl } from '../services/userService';
import { getUserInitials } from '../utils/jobFormatters';

function NavbarAvatar({ user, iconSize = 15, isMobile = false }) {
  const [imgError, setImgError] = useState(false);
  const avatarUrl = user?.profile?.avatarUrl;

  useEffect(() => {
    setImgError(false);
  }, [avatarUrl]);

  const resolvedUrl = avatarUrl ? resolveAvatarUrl(avatarUrl) : '';

  if (resolvedUrl && !imgError) {
    return (
      <img
        key={resolvedUrl}
        src={resolvedUrl}
        alt={user?.name || 'User'}
        className={`navbar-avatar-img ${isMobile ? 'navbar-avatar-img-mobile' : ''}`}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = getUserInitials(user?.name);
  if (initials) {
    return (
      <span
        className={`navbar-avatar-initials ${isMobile ? 'navbar-avatar-initials-mobile' : ''}`}
        aria-hidden="true"
      >
        {initials}
      </span>
    );
  }

  return <User size={iconSize} aria-hidden="true" />;
}

export default function Navbar({ onOpenAuth, onOpenPostJob, onNavigate, appliedCount = 0 }) {
  const { user, isAuthenticated, logout, isRecruiter, isCandidate } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handlePostJobAction = () => {
    setMobileMenuOpen(false);
    if (!isAuthenticated) {
      onOpenAuth('post-job');
    } else if (isRecruiter) {
      if (onOpenPostJob) onOpenPostJob();
      else onOpenAuth('post-job');
    } else {
      onOpenAuth('post-job');
    }
  };

  // Close mobile drawer if viewport expands to desktop (>= 1024px)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLinkClick = (e, sectionId) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${sectionId}`);
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (onNavigate) {
      onNavigate(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const handleBrandClick = (e) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNavigateToProfile = () => {
    setMobileMenuOpen(false);
    navigate('/profile');
  };

  const handleNavigateToDashboard = () => {
    setMobileMenuOpen(false);
    navigate('/recruiter/dashboard');
  };

  const handleNavigateToApplications = () => {
    setMobileMenuOpen(false);
    navigate('/applications');
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo */}
        <a
          href="/"
          className="navbar-brand"
          onClick={handleBrandClick}
          aria-label="CareerPulse ATS - Return to top"
        >
          <div className="brand-logo-icon">
            <Briefcase size={22} className="text-white" aria-hidden="true" />
          </div>
          <div className="brand-text">
            <span className="brand-name">
              Career<span className="brand-highlight">Pulse</span>
            </span>
            <span className="brand-badge">ATS</span>
          </div>
        </a>

        {/* Desktop Navigation Links (>= 1024px) */}
        <nav className="navbar-links" aria-label="Desktop Navigation">
          <a
            href="#categories"
            className="nav-link"
            onClick={(e) => handleLinkClick(e, 'categories')}
          >
            Categories
          </a>
          <a
            href="#featured-jobs"
            className="nav-link"
            onClick={(e) => handleLinkClick(e, 'featured-jobs')}
          >
            Find Jobs
          </a>
          <a
            href="#ats-features"
            className="nav-link"
            onClick={(e) => handleLinkClick(e, 'ats-features')}
          >
            ATS Features
          </a>
          <a
            href="#why-us"
            className="nav-link"
            onClick={(e) => handleLinkClick(e, 'why-us')}
          >
            For Employers
          </a>
        </nav>

        {/* Desktop Action Buttons */}
        <div className="navbar-actions">
          {isAuthenticated ? (
            <div className="navbar-auth-group">
              <button
                type="button"
                className="navbar-user-chip clickable-chip"
                onClick={handleNavigateToProfile}
                title="View & Edit Profile"
                aria-label={`View profile for ${user?.name}`}
              >
                <NavbarAvatar user={user} iconSize={15} isMobile={false} />
                <span className="navbar-user-name">{user?.name}</span>
                <span className={`user-role-badge role-${user?.role}`}>{user?.role}</span>
              </button>
              {isRecruiter && (
                <>
                  <button
                    type="button"
                    className="btn btn-outline btn-recruiter-pipeline"
                    onClick={handleNavigateToDashboard}
                    title="View Applicant Pipeline & Recruiter ATS Dashboard"
                  >
                    <Users size={16} aria-hidden="true" />
                    <span>Pipeline</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-post-job"
                    onClick={handlePostJobAction}
                  >
                    <PlusCircle size={16} aria-hidden="true" />
                    <span>Post a Job</span>
                  </button>
                </>
              )}
              {isCandidate && (
                <button
                  type="button"
                  className="btn btn-outline btn-candidate-applications"
                  onClick={handleNavigateToApplications}
                  title="Track My Job Applications & ATS Status"
                >
                  <Briefcase size={16} aria-hidden="true" />
                  <span>My Applications</span>
                  {appliedCount > 0 && (
                    <span className="navbar-badge-count">{appliedCount}</span>
                  )}
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-logout"
                onClick={logout}
                aria-label="Log out of account"
              >
                <LogOut size={16} aria-hidden="true" />
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => onOpenAuth('login')}
              >
                Log In
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => onOpenAuth('signup')}
              >
                <span>Sign Up</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="btn btn-outline btn-post-job"
                onClick={handlePostJobAction}
              >
                <PlusCircle size={16} aria-hidden="true" />
                <span>Post a Job</span>
              </button>
            </>
          )}

          {/* Mobile / Tablet Menu Toggle Button (< 1024px) */}
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
          >
            {mobileMenuOpen ? (
              <X size={24} aria-hidden="true" />
            ) : (
              <Menu size={24} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          className="mobile-nav-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile / Tablet Dropdown Drawer (< 1024px) */}
      {mobileMenuOpen && (
        <div id="mobile-nav-drawer" className="mobile-nav-drawer" role="dialog" aria-modal="true">
          <nav className="mobile-nav-links" aria-label="Mobile Navigation">
            <a
              href="#categories"
              className="mobile-nav-link"
              onClick={(e) => handleLinkClick(e, 'categories')}
            >
              Categories
            </a>
            <a
              href="#featured-jobs"
              className="mobile-nav-link"
              onClick={(e) => handleLinkClick(e, 'featured-jobs')}
            >
              Find Jobs
            </a>
            <a
              href="#ats-features"
              className="mobile-nav-link"
              onClick={(e) => handleLinkClick(e, 'ats-features')}
            >
              ATS Features
            </a>
            <a
              href="#why-us"
              className="mobile-nav-link"
              onClick={(e) => handleLinkClick(e, 'why-us')}
            >
              For Employers
            </a>
          </nav>

          <div className="mobile-nav-actions">
            {isAuthenticated ? (
              <div className="mobile-user-section">
                <button
                  type="button"
                  className="mobile-user-chip clickable-chip w-full"
                  onClick={handleNavigateToProfile}
                  title="View & Edit Profile"
                  aria-label={`View profile for ${user?.name}`}
                >
                  <NavbarAvatar user={user} iconSize={18} isMobile={true} />
                  <div className="mobile-user-meta">
                    <span className="mobile-user-name">{user?.name}</span>
                    <span className={`user-role-badge role-${user?.role}`}>{user?.role}</span>
                  </div>
                </button>
                {isRecruiter && (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline w-full touch-target"
                      onClick={handleNavigateToDashboard}
                    >
                      <Users size={16} aria-hidden="true" />
                      <span>Applicant Pipeline</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline w-full touch-target"
                      onClick={handlePostJobAction}
                    >
                      <PlusCircle size={16} aria-hidden="true" />
                      <span>Post a Job</span>
                    </button>
                  </>
                )}
                {isCandidate && (
                  <button
                    type="button"
                    className="btn btn-outline w-full touch-target btn-candidate-applications-mobile"
                    onClick={handleNavigateToApplications}
                  >
                    <Briefcase size={16} aria-hidden="true" />
                    <span>My Applications</span>
                    {appliedCount > 0 && (
                      <span className="navbar-badge-count">{appliedCount}</span>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost w-full touch-target btn-logout-mobile"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Log Out</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-ghost w-full touch-target"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('login');
                  }}
                >
                  Log In
                </button>
                <button
                  type="button"
                  className="btn btn-primary w-full touch-target"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
                  }}
                >
                  <span>Sign Up</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="btn btn-outline w-full touch-target"
                  onClick={handlePostJobAction}
                >
                  <PlusCircle size={16} aria-hidden="true" />
                  <span>Post a Job</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

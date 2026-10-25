import React, { useState, useEffect } from 'react';
import { Briefcase, Menu, X, PlusCircle, ArrowRight } from 'lucide-react';

export default function Navbar({ onOpenAuth, onNavigate }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    if (onNavigate) {
      onNavigate(sectionId);
    } else {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="navbar-header">
      <div className="navbar-container">
        {/* Brand Logo */}
        <a
          href="#hero"
          className="navbar-brand"
          onClick={(e) => handleLinkClick(e, 'hero')}
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
            onClick={() => onOpenAuth('post-job')}
          >
            <PlusCircle size={16} aria-hidden="true" />
            <span>Post a Job</span>
          </button>

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
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth('post-job');
              }}
            >
              <PlusCircle size={16} aria-hidden="true" />
              <span>Post a Job</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

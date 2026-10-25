import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Building2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const [mode, setMode] = useState(
    initialMode === 'post-job' ? 'signup' : initialMode
  );
  const [role, setRole] = useState(
    initialMode === 'post-job' ? 'employer' : 'seeker'
  );
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(
      mode === 'login'
        ? `Logged in as ${formData.email || 'demo user'}! (Frontend demo simulation)`
        : `Account created for ${formData.name || 'new user'} as ${
            role === 'employer' ? 'Employer' : 'Candidate'
          }! (Frontend demo simulation)`
    );
    setTimeout(() => {
      setMessage('');
      onClose();
    }, 2000);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-auth-title"
    >
      <div className="modal-container auth-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-pre-title">CareerPulse Portal Access</div>
            <h2 id="modal-auth-title" className="modal-title">
              {mode === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h2>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close authentication dialog"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Demo Notice */}
        <div className="modal-demo-notice" role="note">
          <AlertCircle size={16} className="text-amber-500 shrink-0" aria-hidden="true" />
          <span>
            <strong>Frontend Simulation:</strong> Authentication with JWT, cookies, and database
            user profiles will be connected in future backend steps.
          </span>
        </div>

        {/* Tabs: Login vs Register */}
        <div className="auth-tabs-row" role="tablist" aria-label="Authentication Type">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab-btn ${mode === 'login' ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setMode('login');
              setMessage('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            className={`auth-tab-btn ${mode === 'signup' ? 'auth-tab-active' : ''}`}
            onClick={() => {
              setMode('signup');
              setMessage('');
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Mode message feedback */}
        {message ? (
          <div className="auth-success-banner" role="status">
            <CheckCircle2 size={18} className="text-emerald" aria-hidden="true" />
            <span>{message}</span>
          </div>
        ) : (
          <form className="modal-form" onSubmit={handleSubmit}>
            {/* Role Selector (only for Sign Up) */}
            {mode === 'signup' && (
              <div className="role-selector-group">
                <span className="form-label" id="role-select-label">I am joining as:</span>
                <div className="role-options-grid" role="radiogroup" aria-labelledby="role-select-label">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'seeker'}
                    className={`role-option-btn ${role === 'seeker' ? 'role-option-selected' : ''}`}
                    onClick={() => setRole('seeker')}
                  >
                    <User size={18} aria-hidden="true" />
                    <span>Job Seeker</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'employer'}
                    className={`role-option-btn ${role === 'employer' ? 'role-option-selected' : ''}`}
                    onClick={() => setRole('employer')}
                  >
                    <Building2 size={18} aria-hidden="true" />
                    <span>Employer / Recruiter</span>
                  </button>
                </div>
              </div>
            )}

            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-name">
                  Full Name
                </label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" aria-hidden="true" />
                  <input
                    id="auth-name"
                    name="name"
                    type="text"
                    required
                    placeholder="Jane Doe"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {mode === 'signup' && role === 'employer' && (
              <div className="form-group">
                <label className="form-label" htmlFor="companyName">
                  Company / Organization Name
                </label>
                <div className="input-with-icon">
                  <Building2 size={18} className="input-icon" aria-hidden="true" />
                  <input
                    id="companyName"
                    name="companyName"
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    className="form-input"
                    value={formData.companyName}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">
                Email Address
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" aria-hidden="true" />
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@company.com"
                  className="form-input"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <div className="label-with-aside">
                <label className="form-label" htmlFor="auth-password">
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="btn-text-link"
                    onClick={() => alert('Password reset will be available once backend is built.')}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" aria-hidden="true" />
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="form-input"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full btn-auth-submit touch-target">
              <span>{mode === 'login' ? 'Sign In to CareerPulse' : 'Create Account'}</span>
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

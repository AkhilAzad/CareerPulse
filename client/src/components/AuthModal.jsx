import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  Building2,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  KeyRound,
  ArrowLeft,
  RotateCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} from '../services/authService';

export default function AuthModal({ initialMode = 'login', onClose }) {
  const { login, register } = useAuth();

  const [mode, setMode] = useState(
    initialMode === 'post-job' ? 'signup' : initialMode
  );
  // Allowed public registration roles: candidate or recruiter
  const [role, setRole] = useState(
    initialMode === 'post-job' ? 'recruiter' : 'candidate'
  );

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  // Password Recovery Flow State
  const [recoveryStep, setRecoveryStep] = useState('email'); // 'email' | 'otp' | 'new-password' | 'success'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle countdown timer for OTP resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleTabSwitch = (newMode) => {
    setMode(newMode);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleOpenForgotPassword = () => {
    setMode('forgot-password');
    setRecoveryStep('email');
    setRecoveryEmail(formData.email.trim());
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleReturnToSignIn = () => {
    setMode('login');
    setRecoveryStep('email');
    if (recoveryEmail) {
      setFormData((prev) => ({ ...prev, email: recoveryEmail }));
    }
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Submit handler for Sign In and Sign Up
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    // Client-side validations
    if (mode === 'signup' && (!formData.name || formData.name.trim().length < 2)) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!formData.email || !/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }

    if (!formData.password || formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const response = await login({
          email: formData.email.trim(),
          password: formData.password,
        });
        setSuccessMessage(`Welcome back, ${response?.user?.name || 'User'}!`);
      } else {
        const response = await register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role, // 'candidate' or 'recruiter'
        });
        setSuccessMessage(`Account created successfully for ${response?.user?.name || 'User'}!`);
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Recovery - Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = recoveryEmail.trim();
    if (!cleanEmail || !/^\S+@\S+\.\S+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordResetOTP(cleanEmail);
      setRecoveryStep('otp');
      setResendCooldown(60);
      setSuccessMessage(`If an account exists for ${cleanEmail}, a 6-digit verification code has been sent. Code expires in 10 minutes.`);
    } catch (err) {
      setErrorMessage(err.message || 'Unable to request verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Recovery - Step 2: Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      await requestPasswordResetOTP(recoveryEmail.trim());
      setResendCooldown(60);
      setSuccessMessage(`A new 6-digit verification code was sent to ${recoveryEmail.trim()}.`);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Recovery - Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanOtp = otp.trim();
    if (!cleanOtp || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMessage('Please enter a valid 6-digit numeric verification code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await verifyPasswordResetOTP(recoveryEmail.trim(), cleanOtp);
      if (data?.resetToken) {
        setResetToken(data.resetToken);
        setRecoveryStep('new-password');
        setSuccessMessage('Code verified successfully! Enter your new password below.');
      } else {
        throw new Error('Verification succeeded but reset token was missing.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Recovery - Step 3: Set New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword({
        email: recoveryEmail.trim(),
        resetToken,
        newPassword,
      });
      setRecoveryStep('success');
      setSuccessMessage('Your password has been reset successfully!');
    } catch (err) {
      setErrorMessage(err.message || 'Failed to reset password. Please request a new code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Titles for modal header based on current mode & step
  const getModalTitle = () => {
    if (mode === 'login') return 'Welcome Back';
    if (mode === 'signup') return 'Create an Account';
    if (mode === 'forgot-password') {
      if (recoveryStep === 'email') return 'Reset Your Password';
      if (recoveryStep === 'otp') return 'Enter Verification Code';
      if (recoveryStep === 'new-password') return 'Create New Password';
      if (recoveryStep === 'success') return 'Password Reset Complete';
    }
    return 'CareerPulse Portal Access';
  };

  const getModalPreTitle = () => {
    if (mode === 'forgot-password') {
      if (recoveryStep === 'email') return 'Password Recovery — Step 1 of 3';
      if (recoveryStep === 'otp') return 'Password Recovery — Step 2 of 3';
      if (recoveryStep === 'new-password') return 'Password Recovery — Step 3 of 3';
      if (recoveryStep === 'success') return 'Password Recovery Complete';
    }
    return 'CareerPulse Portal Access';
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
            <div className="modal-pre-title">{getModalPreTitle()}</div>
            <h2 id="modal-auth-title" className="modal-title">
              {getModalTitle()}
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

        {/* Tabs: Sign In vs Sign Up (Visible only in standard auth modes) */}
        {mode !== 'forgot-password' ? (
          <div className="auth-tabs-row" role="tablist" aria-label="Authentication Type">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'login'}
              className={`auth-tab-btn ${mode === 'login' ? 'auth-tab-active' : ''}`}
              onClick={() => handleTabSwitch('login')}
              disabled={isSubmitting}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'signup'}
              className={`auth-tab-btn ${mode === 'signup' ? 'auth-tab-active' : ''}`}
              onClick={() => handleTabSwitch('signup')}
              disabled={isSubmitting}
            >
              Sign Up
            </button>
          </div>
        ) : (
          <div className="auth-recovery-header-bar">
            <button
              type="button"
              className="recovery-back-btn"
              onClick={handleReturnToSignIn}
              disabled={isSubmitting}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>Back to Sign In</span>
            </button>
          </div>
        )}

        {/* Error Feedback Banner */}
        {errorMessage && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={18} className="shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Feedback Banner */}
        {successMessage && mode !== 'forgot-password' && (
          <div className="auth-success-banner" role="status">
            <CheckCircle2 size={18} className="text-emerald shrink-0" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* VIEW 1: Standard Sign In / Sign Up Forms                       */}
        {/* ============================================================== */}
        {mode !== 'forgot-password' && !successMessage && (
          <form className="modal-form" onSubmit={handleSubmit} noValidate>
            {/* Role Selector (only for Sign Up) */}
            {mode === 'signup' && (
              <div className="role-selector-group">
                <span className="form-label" id="role-select-label">I am joining as:</span>
                <div className="role-options-grid" role="radiogroup" aria-labelledby="role-select-label">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'candidate'}
                    className={`role-option-btn ${role === 'candidate' ? 'role-option-selected' : ''}`}
                    onClick={() => setRole('candidate')}
                    disabled={isSubmitting}
                  >
                    <User size={18} aria-hidden="true" />
                    <span>Job Seeker</span>
                  </button>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={role === 'recruiter'}
                    className={`role-option-btn ${role === 'recruiter' ? 'role-option-selected' : ''}`}
                    onClick={() => setRole('recruiter')}
                    disabled={isSubmitting}
                  >
                    <Building2 size={18} aria-hidden="true" />
                    <span>Employer / Recruiter</span>
                  </button>
                </div>
              </div>
            )}

            {/* Name Input (Sign Up Only) */}
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
                    placeholder="e.g. Jane Doe"
                    className="form-input"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {/* Email Input */}
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
                  disabled={isSubmitting}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="form-group">
              <div className="label-with-aside">
                <label className="form-label" htmlFor="auth-password">
                  Password
                </label>
                {mode === 'login' && (
                  <span className="text-xs text-muted">
                    Min. 8 characters
                  </span>
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
                  disabled={isSubmitting}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
              </div>
            </div>

            {/* Forgot Password Link (Below Password Field in Sign In) */}
            {mode === 'login' && (
              <div className="forgot-password-link-wrapper">
                <button
                  type="button"
                  className="btn-text-link forgot-password-trigger"
                  onClick={handleOpenForgotPassword}
                  disabled={isSubmitting}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit Button with Loading State */}
            <button
              type="submit"
              className="btn btn-primary w-full btn-auth-submit touch-target"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>{mode === 'login' ? 'Signing In...' : 'Creating Account...'}</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In to CareerPulse' : 'Create Account'}</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* VIEW 2: Password Recovery Flow                                 */}
        {/* ============================================================== */}
        {mode === 'forgot-password' && (
          <div className="recovery-flow-container">
            {/* Notice message in recovery mode */}
            {successMessage && recoveryStep !== 'success' && (
              <div className="auth-success-banner" role="status">
                <CheckCircle2 size={18} className="text-emerald shrink-0" aria-hidden="true" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* STEP 1: Enter Registered Email */}
            {recoveryStep === 'email' && (
              <form className="modal-form" onSubmit={handleRequestOtp} noValidate>
                <p className="recovery-helper-text">
                  Enter your registered email address below. We will send you a 6-digit verification code to reset your password.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="recovery-email">
                    Registered Email Address
                  </label>
                  <div className="input-with-icon">
                    <Mail size={18} className="input-icon" aria-hidden="true" />
                    <input
                      id="recovery-email"
                      type="email"
                      required
                      autoFocus
                      placeholder="name@company.com"
                      className="form-input"
                      value={recoveryEmail}
                      onChange={(e) => {
                        setRecoveryEmail(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={isSubmitting}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full btn-auth-submit touch-target"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Sending Verification Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Verification Code</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 2: Enter 6-Digit OTP */}
            {recoveryStep === 'otp' && (
              <form className="modal-form" onSubmit={handleVerifyOtp} noValidate>
                <p className="recovery-helper-text">
                  Please enter the 6-digit verification code sent to <strong>{recoveryEmail}</strong>. Codes expire after 10 minutes.
                </p>

                <div className="form-group">
                  <label className="form-label" htmlFor="recovery-otp">
                    6-Digit Verification Code
                  </label>
                  <div className="input-with-icon">
                    <KeyRound size={18} className="input-icon" aria-hidden="true" />
                    <input
                      id="recovery-otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      required
                      autoFocus
                      placeholder="••••••"
                      className="form-input otp-code-input"
                      value={otp}
                      onChange={(e) => {
                        // Allow only numbers and max 6 digits
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(val);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={isSubmitting}
                      autoComplete="one-time-code"
                    />
                  </div>
                </div>

                <div className="otp-actions-row">
                  <button
                    type="button"
                    className="btn-text-link otp-resend-btn"
                    onClick={handleResendOtp}
                    disabled={isSubmitting || resendCooldown > 0}
                  >
                    <RotateCw size={14} className={resendCooldown > 0 ? '' : 'shrink-0'} aria-hidden="true" />
                    <span>
                      {resendCooldown > 0
                        ? `Resend code in ${resendCooldown}s`
                        : 'Resend verification code'}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="btn-text-link otp-change-email-btn"
                    onClick={() => {
                      setRecoveryStep('email');
                      setOtp('');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                    disabled={isSubmitting}
                  >
                    Change email
                  </button>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full btn-auth-submit touch-target"
                  disabled={isSubmitting || otp.trim().length !== 6}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Verifying Code...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify Code</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 3: Enter & Confirm New Password */}
            {recoveryStep === 'new-password' && (
              <form className="modal-form" onSubmit={handleResetPassword} noValidate>
                <p className="recovery-helper-text">
                  Choose a new strong password for your account. It must be at least 8 characters long.
                </p>

                <div className="form-group">
                  <div className="label-with-aside">
                    <label className="form-label" htmlFor="recovery-new-password">
                      New Password
                    </label>
                    <span className="text-xs text-muted">Min. 8 characters</span>
                  </div>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" aria-hidden="true" />
                    <input
                      id="recovery-new-password"
                      type="password"
                      required
                      autoFocus
                      placeholder="••••••••"
                      className="form-input"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="recovery-confirm-password">
                    Confirm New Password
                  </label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" aria-hidden="true" />
                    <input
                      id="recovery-confirm-password"
                      type="password"
                      required
                      placeholder="••••••••"
                      className="form-input"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full btn-auth-submit touch-target"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Resetting Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Update Password</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP 4: Reset Success Confirmation */}
            {recoveryStep === 'success' && (
              <div className="modal-success-state">
                <div className="success-icon-wrapper">
                  <CheckCircle2 size={36} className="text-emerald" aria-hidden="true" />
                </div>
                <h3 className="success-title">Password Reset Complete</h3>
                <p className="success-desc">
                  Your password has been securely updated. You can now sign in to CareerPulse ATS with your new password.
                </p>

                <button
                  type="button"
                  className="btn btn-primary w-full touch-target"
                  onClick={handleReturnToSignIn}
                >
                  <span>Sign In Now</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

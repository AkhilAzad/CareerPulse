const { User } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/token');
const {
  generateOtp,
  hashOtp,
  generateResetToken,
  hashResetToken,
} = require('../utils/security');
const {
  isMailConfigured,
  getSmtpStatus,
  sendPasswordResetEmail,
} = require('../utils/mailer');

// Allowed public self-registration roles
const ALLOWED_REGISTER_ROLES = ['candidate', 'recruiter'];

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (candidate or recruiter)
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'candidate' } = req.body || {};

    // 1. Validate name
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Name is required and must be between 2 and 100 characters.',
      });
    }

    // 2. Validate email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A valid email address is required.',
      });
    }

    // 3. Validate password
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Password is required and must be at least 8 characters long.',
      });
    }

    // 4. Validate and restrict role
    const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : 'candidate';
    if (normalizedRole === 'admin') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Self-registration as administrator is not permitted.',
      });
    }

    if (!ALLOWED_REGISTER_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: `Invalid role. Public registration is only available for: ${ALLOWED_REGISTER_ROLES.join(', ')}.`,
      });
    }

    // 5. Normalize inputs
    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 6. Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        status: 409,
        message: 'An account with this email address already exists.',
      });
    }

    // 7. Hash password
    const passwordHash = await hashPassword(password);

    // 8. Create user record
    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
    });

    // 9. Generate JWT
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // 10. Respond with safe user information (never passwordHash)
    return res.status(201).json({
      success: true,
      status: 201,
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    // Handle Mongoose duplicate key race condition
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        status: 409,
        message: 'An account with this email address already exists.',
      });
    }
    return next(error);
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and return JWT
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    // 1. Basic validation
    if (!email || typeof email !== 'string' || !password || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Locate user and explicitly select passwordHash
    const user = await User.findOne({ email: normalizedEmail, isActive: true }).select('+passwordHash');
    if (!user) {
      // Use generic error message to prevent user enumeration
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid email or password.',
      });
    }

    // 3. Compare password
    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid email or password.',
      });
    }

    // 4. Generate JWT
    const token = generateToken({
      id: user._id,
      email: user.email,
      role: user.role,
    });

    // 5. Respond with token and safe user profile
    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile: user.profile,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Private (Authenticated)
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: 'User not found.',
      });
    }

    return res.status(200).json({
      success: true,
      status: 200,
      user: user.toSafeObject ? user.toSafeObject() : user,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request a 6-digit password reset OTP sent via email
 * @access  Public (Rate-limited)
 */
const requestPasswordResetOTP = async (req, res, next) => {
  try {
    const { email } = req.body || {};

    // 1. Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A valid email address is required.',
      });
    }

    // 2. Ensure mail service is configured (fail safely without false claims)
    const smtpStatus = getSmtpStatus();
    if (!smtpStatus.isConfigured) {
      const missingList = smtpStatus.missing.join(', ');
      return res.status(503).json({
        success: false,
        status: 503,
        message: `Email service is not configured. Missing required SMTP settings: ${missingList} in server/.env. Please configure your Gmail credentials to enable password recovery.`,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Query user account
    const user = await User.findOne({ email: normalizedEmail, isActive: true }).select('+passwordReset.otpHash');

    // Generic success response to prevent email enumeration
    const genericResponse = {
      success: true,
      status: 200,
      message: 'If an account exists with this email address, a 6-digit verification code has been sent.',
    };

    if (!user) {
      return res.status(200).json(genericResponse);
    }

    // 4. Generate 6-digit OTP and store cryptographic hash with 10-minute validity
    const otp = generateOtp();
    const otpHash = hashOtp(otp);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.passwordReset = {
      otpHash,
      otpExpiresAt,
      otpAttempts: 0,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    };

    await user.save();

    // 5. Deliver OTP via email
    try {
      await sendPasswordResetEmail(user.email, otp);
    } catch (mailErr) {
      console.error('[Mailer Error] Password reset email dispatch failed:', mailErr.message);
      let friendlyMessage = 'Failed to deliver verification email. Please try again later.';
      if (
        mailErr.message &&
        (mailErr.message.includes('Invalid login') ||
          mailErr.message.includes('Username and Password not accepted') ||
          mailErr.message.includes('BadCredentials'))
      ) {
        friendlyMessage = 'Gmail authentication failed. Please verify your Google App Password in server/.env.';
      }
      return res.status(503).json({
        success: false,
        status: 503,
        message: friendlyMessage,
      });
    }

    return res.status(200).json(genericResponse);
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify 6-digit OTP and exchange for a short-lived single-use resetToken
 * @access  Public (Rate-limited)
 */
const verifyPasswordResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body || {};

    // 1. Validate inputs
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A valid email address is required.',
      });
    }

    if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp.trim())) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A valid 6-digit verification code is required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    // 2. Fetch user and reset credentials
    const user = await User.findOne({ email: normalizedEmail, isActive: true }).select(
      '+passwordReset.otpHash +passwordReset.resetTokenHash'
    );

    if (!user || !user.passwordReset || !user.passwordReset.otpHash) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid or expired verification code.',
      });
    }

    // 3. Verify expiration (10 minutes)
    if (!user.passwordReset.otpExpiresAt || user.passwordReset.otpExpiresAt < new Date()) {
      user.passwordReset = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Verification code has expired. Please request a new code.',
      });
    }

    // 4. Verify attempt limit (max 5 failed attempts)
    if (user.passwordReset.otpAttempts >= 5) {
      user.passwordReset = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Too many incorrect attempts. This verification code has been invalidated. Please request a new code.',
      });
    }

    // 5. Compare cryptographic OTP hash
    const inputHash = hashOtp(cleanOtp);
    if (inputHash !== user.passwordReset.otpHash) {
      user.passwordReset.otpAttempts = (user.passwordReset.otpAttempts || 0) + 1;
      const remainingAttempts = 5 - user.passwordReset.otpAttempts;

      if (user.passwordReset.otpAttempts >= 5) {
        user.passwordReset.otpHash = undefined;
        user.passwordReset.otpExpiresAt = undefined;
      }

      await user.save();

      return res.status(400).json({
        success: false,
        status: 400,
        message:
          remainingAttempts > 0
            ? `Invalid verification code. ${remainingAttempts} attempt(s) remaining.`
            : 'Too many incorrect attempts. This verification code has been invalidated. Please request a new code.',
      });
    }

    // 6. OTP matched: invalidate OTP and issue single-use resetToken (valid 15 minutes)
    const resetToken = generateResetToken();
    const resetTokenHash = hashResetToken(resetToken);

    user.passwordReset = {
      otpHash: undefined,
      otpExpiresAt: undefined,
      otpAttempts: 0,
      resetTokenHash,
      resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15-minute reset session
    };

    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Verification code confirmed. You may now reset your password.',
      resetToken,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using single-use resetToken and bcrypt hashing
 * @access  Public
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, resetToken, newPassword } = req.body || {};

    // 1. Validate inputs
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'A valid email address is required.',
      });
    }

    if (!resetToken || typeof resetToken !== 'string' || resetToken.trim().length === 0) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Reset token is required.',
      });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'New password is required and must be at least 8 characters long.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanToken = resetToken.trim();

    // 2. Fetch user with reset token and password hash
    const user = await User.findOne({ email: normalizedEmail, isActive: true }).select(
      '+passwordReset.resetTokenHash +passwordHash'
    );

    if (!user || !user.passwordReset || !user.passwordReset.resetTokenHash) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid or expired password reset session. Please request a new code.',
      });
    }

    // 3. Check reset session expiration
    if (!user.passwordReset.resetTokenExpiresAt || user.passwordReset.resetTokenExpiresAt < new Date()) {
      user.passwordReset = undefined;
      await user.save();
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Password reset session has expired. Please request a new code.',
      });
    }

    // 4. Compare cryptographic reset token hash
    const inputTokenHash = hashResetToken(cleanToken);
    if (inputTokenHash !== user.passwordReset.resetTokenHash) {
      return res.status(400).json({
        success: false,
        status: 400,
        message: 'Invalid reset token.',
      });
    }

    // 5. Hash new password with bcrypt (cost factor 12)
    const newPasswordHash = await hashPassword(newPassword);

    // 6. Update user password and permanently clear reset tokens (single-use)
    user.passwordHash = newPasswordHash;
    user.passwordReset = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      status: 200,
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
};

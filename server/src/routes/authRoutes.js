const express = require('express');
const {
  register,
  login,
  getMe,
  requestPasswordResetOTP,
  verifyPasswordResetOTP,
  resetPassword,
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');
const {
  forgotPasswordLimiter,
  verifyOtpLimiter,
} = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * Public Authentication Endpoints
 */
router.post('/register', register);
router.post('/login', login);

/**
 * Password Recovery & OTP Verification Endpoints
 */
router.post('/forgot-password', forgotPasswordLimiter, requestPasswordResetOTP);
router.post('/verify-otp', verifyOtpLimiter, verifyPasswordResetOTP);
router.post('/reset-password', resetPassword);

/**
 * Protected Endpoints
 */
router.get('/me', authenticate, getMe);

/**
 * Role-Protected Verification Endpoints
 */
router.get('/candidate-only', authenticate, authorize('candidate'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized candidate access granted.',
    user: req.user,
  });
});

router.get('/recruiter-only', authenticate, authorize('recruiter'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized recruiter access granted.',
    user: req.user,
  });
});

router.get('/admin-only', authenticate, authorize('admin'), (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Authorized admin access granted.',
    user: req.user,
  });
});

module.exports = router;

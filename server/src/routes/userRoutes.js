const express = require('express');
const {
  getProfile,
  updateProfile,
  uploadResume,
  deleteResume,
  downloadResume,
  uploadAvatar,
  getAvatar,
  deleteAvatar,
} = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/users/profile
 * @desc    Fetch authenticated user profile details
 * @access  Private (Candidate, Recruiter, Admin)
 */
router.get('/profile', authenticate, getProfile);

/**
 * @route   PATCH /api/users/profile
 * @desc    Update authenticated user's profile details
 * @access  Private (Candidate, Recruiter, Admin)
 */
router.patch('/profile', authenticate, updateProfile);

/**
 * @route   POST /api/users/avatar
 * @desc    Upload profile photo (JPG, JPEG, PNG, WebP up to 2MB)
 * @access  Private (Authenticated)
 */
router.post('/avatar', authenticate, uploadAvatar);

/**
 * @route   GET /api/users/:id/avatar
 * @desc    Fetch / stream user profile photo with initials fallback
 * @access  Public
 */
router.get('/:id/avatar', getAvatar);

/**
 * @route   DELETE /api/users/avatar
 * @desc    Remove authenticated user's profile photo
 * @access  Private (Authenticated)
 */
router.delete('/avatar', authenticate, deleteAvatar);

/**
 * @route   POST /api/users/resume
 * @desc    Upload / attach resume metadata to candidate profile
 * @access  Private (Authenticated)
 */
router.post('/resume', authenticate, uploadResume);

/**
 * @route   GET /api/users/resume/download
 * @desc    Download / stream attached resume for authenticated user
 * @access  Private (Authenticated)
 */
router.get('/resume/download', authenticate, downloadResume);

/**
 * @route   DELETE /api/users/resume
 * @desc    Remove attached resume metadata from candidate profile
 * @access  Private (Authenticated)
 */
router.delete('/resume', authenticate, deleteResume);

module.exports = router;

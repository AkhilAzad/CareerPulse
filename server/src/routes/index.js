const express = require('express');
const healthRoutes = require('./healthRoutes');
const authRoutes = require('./authRoutes');
const jobRoutes = require('./jobRoutes');
const userRoutes = require('./userRoutes');
const applicationRoutes = require('./applicationRoutes');

const router = express.Router();

// Mount Health Check endpoint at /api/health
router.use('/health', healthRoutes);

// Mount Authentication routes under /api/auth
router.use('/auth', authRoutes);

// Mount Jobs routes under /api/jobs
router.use('/jobs', jobRoutes);

// Mount Users/Profile routes under /api/users
router.use('/users', userRoutes);

// Mount Applications routes under /api/applications
router.use('/applications', applicationRoutes);

// Optional root API index route at /api
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CareerPulse ATS API Gateway',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

module.exports = router;

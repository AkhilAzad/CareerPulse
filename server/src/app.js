const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { corsOptions } = require('./config/cors');
const { globalRateLimiter } = require('./middleware/rateLimiter');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const apiRoutes = require('./routes');

// Initialize Express application
const app = express();

// Trust reverse proxy headers (e.g. for accurate client IP in rate limiting)
app.set('trust proxy', 1);

// Security HTTP headers (cross-origin resource policy enabled to allow avatar and asset streaming)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Cross-Origin Resource Sharing with configurable allowlist
app.use(cors(corsOptions));

// Global Rate Limiting
app.use(globalRateLimiter);

// Body parsers for JSON and URL-encoded payloads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root Service Greeting
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'CareerPulse ATS API Server',
    health: '/api/health',
  });
});

// Mount Central API Routes under /api
app.use('/api', apiRoutes);

// Catch-all 404 Handler for Unmatched Endpoints
app.use(notFoundHandler);

// Centralized Global Error Handler
app.use(errorHandler);

module.exports = app;

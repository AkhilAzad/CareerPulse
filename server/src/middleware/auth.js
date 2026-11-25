const mongoose = require('mongoose');
const { verifyToken } = require('../utils/token');
const { User } = require('../models');

/**
 * Authentication Middleware
 * Validates Bearer token from Authorization header and attaches authenticated user data to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Authentication required. No Bearer token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Authentication token missing.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (tokenErr) {
      if (tokenErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          status: 401,
          message: 'Authentication token has expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Invalid authentication token.',
      });
    }

    // Assign decoded payload to req.user
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };

    // If MongoDB is actively connected, verify the account is still active
    if (mongoose.connection.readyState === 1) {
      const userDoc = await User.findById(decoded.id).select('name email role isActive');
      if (!userDoc || userDoc.isActive === false) {
        return res.status(401).json({
          success: false,
          status: 401,
          message: 'User account not found or deactivated.',
        });
      }
      req.user.role = userDoc.role;
      req.userDoc = userDoc;
    }

    return next();
  } catch (err) {
    return next(err);
  }
};

/**
 * Role-Based Authorization Middleware Factory
 * Restricts access to one or more allowed user roles ('candidate', 'recruiter', 'admin').
 * @param {...string} allowedRoles Allowed user roles
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        status: 401,
        message: 'Authentication required before checking permissions.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        status: 403,
        message: `Forbidden. Access requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    return next();
  };
};

module.exports = {
  authenticate,
  authorize,
};

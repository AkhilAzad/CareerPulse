import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, onRequireAuth, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="profile-loading-screen" aria-live="polite" aria-busy="true">
        <div className="spinner-large" />
        <p>Loading your account details...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Notify parent to open sign-in modal if callback provided
    if (onRequireAuth) {
      onRequireAuth('login');
    }
    return <Navigate to="/" state={{ from: location, openAuth: 'login' }} replace />;
  }

  // Role check: If restricted to specific roles, redirect unauthorized users
  if (allowedRoles && Array.isArray(allowedRoles) && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

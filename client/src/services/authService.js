/**
 * Authentication Service for CareerPulse ATS
 * Interacts with the backend Express authentication endpoints.
 * Never logs credentials, passwords, or tokens.
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const TOKEN_KEY = 'careerpulse_auth_token';
const USER_KEY = 'careerpulse_auth_user';

/**
 * Retrieve the current JWT token from local storage
 */
export const getStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch (_) {
    return null;
  }
};

/**
 * Retrieve the cached user object from local storage
 */
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
};

/**
 * Store session credentials
 */
export const setSession = (token, user) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (_) {
    // Storage quota or private browsing exceptions handled silently
  }
};

/**
 * Remove session credentials
 */
export const clearSession = () => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (_) {
    // Handled silently
  }
};

/**
 * Handle API HTTP response and error parsing
 */
const handleResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (_) {
    data = { message: 'An unexpected response was received from the server.' };
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * User Login
 * @param {Object} credentials { email, password }
 */
export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse(response);

  if (data.token && data.user) {
    setSession(data.token, data.user);
  }

  return data;
};

/**
 * User Registration
 * @param {Object} userData { name, email, password, role }
 */
export const registerUser = async ({ name, email, password, role = 'candidate' }) => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password, role }),
  });

  const data = await handleResponse(response);

  if (data.token && data.user) {
    setSession(data.token, data.user);
  }

  return data;
};

/**
 * Fetch current authenticated user profile using stored JWT
 */
export const fetchCurrentUser = async () => {
  const token = getStoredToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  return handleResponse(response);
};

/**
 * Request Password Reset OTP via Email
 * @param {string} email
 */
export const requestPasswordResetOTP = async (email) => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse(response);
};

/**
 * Verify 6-digit Password Reset OTP
 * @param {string} email
 * @param {string} otp
 */
export const verifyPasswordResetOTP = async (email, otp) => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, otp }),
  });

  return handleResponse(response);
};

/**
 * Reset Password using verified single-use resetToken
 * @param {Object} params { email, resetToken, newPassword }
 */
export const resetPassword = async ({ email, resetToken, newPassword }) => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, resetToken, newPassword }),
  });

  return handleResponse(response);
};

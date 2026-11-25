/**
 * Job Service for CareerPulse ATS
 * Interacts with the backend Express Jobs API endpoints.
 */
import { getStoredToken } from './authService';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');

const getAuthHeaders = () => {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  let data;
  try {
    data = await response.json();
  } catch (_) {
    data = { message: 'Invalid response from server' };
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (HTTP ${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

/**
 * Fetch published job listings with search, filters, and pagination
 * @param {Object} params { page, limit, search, location, employmentType, workplaceType, experienceLevel, minSalary, maxSalary, category, skills, featured }
 */
export const fetchJobs = async (params = {}) => {
  const query = new URLSearchParams();

  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.search && params.search.trim()) query.set('search', params.search.trim());
  if (params.location && params.location.trim()) query.set('location', params.location.trim());
  if (params.employmentType && params.employmentType !== 'All') {
    query.set('employmentType', params.employmentType.trim());
  }
  if (params.workplaceType && params.workplaceType !== 'all') {
    query.set('workplaceType', params.workplaceType.trim());
  }
  if (params.experienceLevel && params.experienceLevel !== 'all') {
    query.set('experienceLevel', params.experienceLevel.trim());
  }
  if (params.minSalary != null && params.minSalary !== '') {
    query.set('minSalary', params.minSalary);
  }
  if (params.maxSalary != null && params.maxSalary !== '') {
    query.set('maxSalary', params.maxSalary);
  }
  if (params.category && params.category !== 'all') {
    query.set('category', params.category.trim());
  }
  if (params.skills && params.skills.trim()) {
    query.set('skills', params.skills.trim());
  }
  if (params.featured) {
    query.set('featured', 'true');
  }

  const url = `${API_BASE_URL}/jobs${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(response);
};

/**
 * Fetch a published job by ID
 * @param {string} id Job MongoDB ObjectId
 */
export const fetchJobById = async (id) => {
  if (!id) throw new Error('Job ID is required');

  const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return handleResponse(response);
};

/**
 * Create a new job listing (Authenticated Recruiter only)
 * @param {Object} jobData
 */
export const createJobListing = async (jobData) => {
  const response = await fetch(`${API_BASE_URL}/jobs`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(jobData),
  });

  return handleResponse(response);
};

/**
 * Fetch all jobs created by authenticated recruiter
 */
export const fetchMyJobs = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status) query.set('status', params.status);

  const url = `${API_BASE_URL}/jobs/mine${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Update status of an existing job (published, draft, closed)
 */
export const updateJobStatus = async (id, status) => {
  const response = await fetch(`${API_BASE_URL}/jobs/${id}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  return handleResponse(response);
};

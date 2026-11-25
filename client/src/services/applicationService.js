/**
 * Application Service for CareerPulse ATS
 * Interacts with backend Express application endpoints for candidate submissions and recruiter pipeline.
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
    data = { message: 'Unexpected response from server' };
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
 * Submit candidate job application
 * @param {string} jobId
 * @param {Object} applicationData { useProfileResume, fileData, originalName, mimeType, sizeBytes, coverLetter }
 */
export const applyForJob = async (jobId, applicationData) => {
  if (!jobId) throw new Error('Job ID is required to apply.');

  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/apply`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(applicationData),
  });

  return handleResponse(response);
};

/**
 * Fetch candidate's own submitted applications
 * @param {Object} params { page, limit, status }
 */
export const fetchMyApplications = async (params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status && params.status !== 'all') query.set('status', params.status);

  const url = `${API_BASE_URL}/applications/mine${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Fetch candidate applications for a specific job or all recruiter jobs
 * @param {string} jobId 'all' or MongoDB job ID
 * @param {Object} params { page, limit, status }
 */
export const fetchJobApplications = async (jobId = 'all', params = {}) => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.limit) query.set('limit', params.limit);
  if (params.status && params.status !== 'all') query.set('status', params.status);

  const endpoint =
    jobId && jobId !== 'all'
      ? `${API_BASE_URL}/jobs/${jobId}/applications`
      : `${API_BASE_URL}/applications/recruiter`;

  const url = `${endpoint}${query.toString() ? `?${query.toString()}` : ''}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  return handleResponse(response);
};

/**
 * Update review status of an application in recruiter pipeline
 * @param {string} applicationId
 * @param {string} status ('submitted', 'under_review', 'shortlisted', 'interview_scheduled', 'rejected', 'accepted')
 */
export const updateApplicationStatus = async (applicationId, status) => {
  if (!applicationId) throw new Error('Application ID is required.');

  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/status`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });

  return handleResponse(response);
};

/**
 * Add a recruiter note to an application
 * @param {string} applicationId
 * @param {string} note
 */
export const addRecruiterNote = async (applicationId, note) => {
  if (!applicationId) throw new Error('Application ID is required.');

  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ note }),
  });

  return handleResponse(response);
};

/**
 * Securely download applicant resume
 * @param {string} applicationId
 */
export const downloadApplicantResume = async (applicationId) => {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/resume`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errMessage = 'Failed to download applicant resume.';
    try {
      const errJson = await response.json();
      errMessage = errJson.message || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }

  let fileName = 'applicant_resume.pdf';
  const disposition = response.headers.get('Content-Disposition');
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) {
      fileName = decodeURIComponent(match[1]);
    }
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(blobUrl);

  return { success: true, fileName };
};

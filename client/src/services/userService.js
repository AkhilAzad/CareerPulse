/**
 * User Service for CareerPulse ATS
 * Interacts with backend Express user and profile endpoints.
 * Never stores plain text secrets.
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
 * Fetch authenticated user's complete profile
 */
export const fetchUserProfile = async () => {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Update authenticated user's profile
 * @param {Object} profileData
 */
export const updateUserProfile = async (profileData) => {
  const response = await fetch(`${API_BASE_URL}/users/profile`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify(profileData),
  });
  return handleResponse(response);
};

/**
 * Upload resume file with base64 data and metadata
 * @param {File} file
 */
export const uploadResumeFile = async (file) => {
  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${API_BASE_URL}/users/resume`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      originalName: file.name,
      mimeType: file.type || 'application/pdf',
      sizeBytes: file.size,
      fileData: base64Data,
    }),
  });
  return handleResponse(response);
};

/**
 * Upload resume metadata
 * @param {Object} resumeMetadata { originalName, storageKey, mimeType, sizeBytes, fileData }
 */
export const uploadResumeMetadata = async (resumeMetadata) => {
  const response = await fetch(`${API_BASE_URL}/users/resume`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(resumeMetadata),
  });
  return handleResponse(response);
};

/**
 * Securely download authenticated user's attached resume
 */
export const downloadUserResume = async () => {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}/users/resume/download`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    let errMessage = 'Failed to download resume';
    try {
      const errJson = await response.json();
      errMessage = errJson.message || errMessage;
    } catch (_) {}
    throw new Error(errMessage);
  }

  // Extract filename from Content-Disposition if present
  let fileName = 'resume.pdf';
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

/**
 * Delete resume metadata
 */
export const deleteUserResume = async () => {
  const response = await fetch(`${API_BASE_URL}/users/resume`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

/**
 * Convert relative avatar URL to full endpoint URL if needed
 */
export const resolveAvatarUrl = (avatarUrl) => {
  if (!avatarUrl) return '';
  if (avatarUrl.startsWith('data:') || avatarUrl.startsWith('blob:') || avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
    return avatarUrl;
  }
  const rootOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = avatarUrl.startsWith('/') ? avatarUrl : `/${avatarUrl}`;
  return `${rootOrigin}${cleanPath}`;
};

/**
 * Upload profile photo (JPG, JPEG, PNG, WebP up to 2MB)
 * @param {File} file
 */
export const uploadUserAvatar = async (file) => {
  if (!file) throw new Error('No image file selected');

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const ext = file.name.split('.').pop()?.toLowerCase();
  const allowedExts = ['jpg', 'jpeg', 'png', 'webp'];

  if (!allowedTypes.includes(file.type) && !allowedExts.includes(ext)) {
    throw new Error('Please select a JPG, JPEG, PNG, or WebP image file.');
  }

  const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
  if (file.size > MAX_SIZE) {
    throw new Error('Profile photo must be less than 2 MB.');
  }

  const base64Data = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  const response = await fetch(`${API_BASE_URL}/users/avatar`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      originalName: file.name,
      mimeType: file.type || 'image/png',
      sizeBytes: file.size,
      fileData: base64Data,
    }),
  });

  return handleResponse(response);
};

/**
 * Remove authenticated user's profile photo
 */
export const deleteUserAvatar = async () => {
  const response = await fetch(`${API_BASE_URL}/users/avatar`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return handleResponse(response);
};

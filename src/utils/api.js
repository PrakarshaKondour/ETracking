// utils/api.js
import { getAuthToken, clearAuth } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err) {
    // Network-level failure (server down, CORS blocked, etc.)
    throw new Error('Network error');
  }

  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    // Auto-logout on 401 to prevent stuck “Network error”
    if (response.status === 401) {
      clearAuth();
    }
    const message = body?.message || `API error: ${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body; // { ok: true, ... }
}

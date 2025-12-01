// utils/api.js
import { getAuthToken, clearAuth } from './auth';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  console.log('🔐 JWT Token (storage preview):', token ? `${token.slice(0,20)}...` : 'NO TOKEN');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const fetchConfig = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body !== undefined) {
    // if body is already a string (caller may pass JSON string) honor it
    fetchConfig.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, fetchConfig);
  } catch (err) {
    console.error('Network error when calling', endpoint, err);
    throw new Error('Network error');
  }

  const status = response.status;
  console.log(`📡 ${fetchConfig.method} ${endpoint} - Status: ${status}`);

  // try to parse JSON, but allow empty
  let body = null;
  try { body = await response.json(); } catch (e) { body = null; }

  if (!response.ok) {
    // auto-logout on 401
    if (status === 401) {
      console.warn('401 received, clearing auth');
      clearAuth();
    }
    const msg = body?.message || `API error: ${status} ${response.statusText}`;
    const error = new Error(msg);
    error.status = status;
    error.body = body;
    throw error;
  }

  return body;
}

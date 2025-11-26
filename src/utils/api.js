import { getAuthToken } from './auth';

const API_URL = 'http://localhost:5000';

export async function apiCall(endpoint, options = {}) {
  const token = getAuthToken();
  
  // Log token for debugging
  console.log('🔐 JWT Token:', token ? `${token.slice(0, 20)}...` : 'No token found');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log('✅ Authorization header set');
  } else {
    console.warn('⚠️ No token available for request');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  console.log(`📡 ${options.method || 'GET'} ${endpoint} - Status: ${response.status}`);

  if (!response.ok) {
    const error = `API error: ${response.status} ${response.statusText}`;
    console.error('❌', error);
    throw new Error(error);
  }

  return response.json();
}

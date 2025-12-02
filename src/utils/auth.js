export function setAuth({ role, user, token }, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  
  console.log('🔐 Saving auth - Role:', role, 'Token:', token ? token.slice(0, 30) + '...' : 'none');
  
  storage.setItem('userRole', role);
  if (user) storage.setItem('user', JSON.stringify(user));
  if (token) storage.setItem('authToken', token);
  
  // Verify it was saved
  const savedToken = storage.getItem('authToken');
  console.log('✅ Auth saved. Token in storage:', savedToken ? savedToken.slice(0, 30) + '...' : 'NOT SAVED');
}

export function clearAuth() {
  try {
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    console.log('🔓 Auth cleared');
  } catch (e) { /* ignore */ }
}

export function getAuthToken() {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  console.log('🔍 Getting auth token from storage:', token ? token.slice(0, 30) + '...' : 'NOT FOUND');
  return token || null;
}

export function getUserRole() {
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || null;
}

export function isAuthenticated() {
  return !!getAuthToken();
}
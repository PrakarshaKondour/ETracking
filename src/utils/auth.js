/**
 * Listener for storage changes (multi-tab sync)
 */
let storageChangeListeners = [];

export function onAuthChange(callback) {
  storageChangeListeners.push(callback);
}

export function offAuthChange(callback) {
  storageChangeListeners = storageChangeListeners.filter(l => l !== callback);
}

function notifyAuthChange() {
  storageChangeListeners.forEach(cb => cb());
}

// Listen for storage changes (when logged in from another tab)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'authToken' || event.key === 'userRole' || event.key === 'user') {
      console.log('🔄 Auth state changed in another tab:', event.key, event.newValue ? 'SET' : 'CLEARED');
      notifyAuthChange();
    }
  });
}

export function setAuth({ role, user, token }, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  
  console.log('🔐 Saving auth - Role:', role, 'Token:', token ? token.slice(0, 30) + '...' : 'none');
  
  storage.setItem('userRole', role);
  if (user) storage.setItem('user', JSON.stringify(user));
  if (token) storage.setItem('authToken', token);
  
  // Verify it was saved
  const savedToken = storage.getItem('authToken');
  console.log('✅ Auth saved. Token in storage:', savedToken ? savedToken.slice(0, 30) + '...' : 'NOT SAVED');
  
  notifyAuthChange();
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
  
  notifyAuthChange();
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
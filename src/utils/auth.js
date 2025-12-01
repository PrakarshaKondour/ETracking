export function setAuth({ role, user, token }, remember = false) {
  // store token in chosen storage and remove from the other to avoid stale tokens
  const storage = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;

  try {
    other.removeItem('authToken');
    other.removeItem('userRole');
    other.removeItem('user');
  } catch (e) { /* ignore */ }

  console.log('🔐 Saving auth - Role:', role);
  console.log('🔐 Token (preview):', token ? token.slice(0, 30) + '...' : 'none');

  if (role) storage.setItem('userRole', role);
  if (user) storage.setItem('user', JSON.stringify(user));
  if (token) storage.setItem('authToken', token);

  // verify
  const saved = storage.getItem('authToken');
  console.log('✅ Auth saved to', remember ? 'localStorage' : 'sessionStorage', '-', saved ? 'YES' : 'NO');
}

export function clearAuth() {
  try {
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    console.log('🔓 Auth cleared from all storages');
  } catch (e) { console.error('Error clearing auth:', e); }
}

export function getAuthToken() {
  const localToken = localStorage.getItem('authToken');
  const sessionToken = sessionStorage.getItem('authToken');
  const token = localToken || sessionToken || null;
  console.log('🔍 token - local:', !!localToken, 'session:', !!sessionToken);
  return token;
}

export function getUserRole() {
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || null;
}

export function isAuthenticated() {
  return !!getAuthToken();
}
export function setAuth({ role, user, token }, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('userRole', role);
  if (user) storage.setItem('user', JSON.stringify(user));
  if (token) storage.setItem('authToken', token);
}

export function clearAuth() {
  try {
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
  } catch (e) { /* ignore */ }
}

export function getAuthToken() {
  return localStorage.getItem('authToken') || sessionStorage.getItem('authToken') || null;
}

export function getUserRole() {
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || null;
}

export function isAuthenticated() {
  return !!getAuthToken();
}
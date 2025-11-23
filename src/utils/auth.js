export function setAuth({ role, user }, remember = false) {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem('userRole', role);
  if (user) storage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  try {
    // remove from both storages and any token key you might add later
    localStorage.removeItem('userRole');
    localStorage.removeItem('user');
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
  } catch (e) { /* ignore */ }
}

export function getUserRole() {
  return localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || null;
}

export function isAuthenticated() {
  return !!getUserRole();
}
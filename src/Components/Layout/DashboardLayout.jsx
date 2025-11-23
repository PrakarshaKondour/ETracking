import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import './Layout.css';
import { clearAuth, getUserRole } from '../../utils/auth';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const role = getUserRole();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!role) navigate('/login', { replace: true });
  }, [navigate, role]);

  const handleLogout = () => {
    clearAuth();
    navigate('/login', { replace: true });
    setTimeout(() => window.location.reload(), 20);
  };

  const links = {
    admin: [
      { to: 'dashboard', label: 'Dashboard' },
      { to: 'customers', label: 'Customers' },
      { to: 'orders', label: 'Orders' },
      { to: 'vendors', label: 'Vendors' },
      { to: 'analytics', label: 'Analytics' },
    ],
    vendor: [
      { to: 'dashboard', label: 'Dashboard' },
      { to: 'orders', label: 'Orders' },
      { to: 'analytics', label: 'Analytics' },
      { to: 'profile', label: 'Profile' },
    ],
    customer: [
      { to: 'dashboard', label: 'Dashboard' },
      { to: 'orders', label: 'Orders' },
      { to: 'profile', label: 'Profile' },
    ],
  };

  // username for friendly fallbacks
  const username = (() => {
    try {
      const u = localStorage.getItem('user') || sessionStorage.getItem('user');
      return u ? JSON.parse(u).username : null;
    } catch {
      return null;
    }
  })();

  return (
    <div className="app-shell">
      {/* collapsible sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-hidden={!open && window.innerWidth < 880}>
        <div className="sidebar-inner">
          <div className="brand">MyApp</div>
          <nav>
            {(links[role] || []).map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                className="side-link"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="who">Signed in as <strong>{username ?? role}</strong></div>
            <button className="logout-btn sidebar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>

      {/* overlay for small screens */}
      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <button
            className="hamburger"
            aria-label="Open menu"
            onClick={() => setOpen(v => !v)}
          >
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <div className="topbar-right">
            <div className="role-label">{role?.toUpperCase() || ''}</div>
            <button className="logout-btn topbar-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
"use client"

import { useEffect, useState } from "react"
import { Outlet, useNavigate, NavLink } from "react-router-dom"
import "./Layout.css"
import { clearAuth, getUserRole } from "../../utils/auth"
import { apiCall } from "../../utils/api"

const DashboardLayout = () => {
  const navigate = useNavigate()
  const role = getUserRole()
  const [open, setOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode")
    return saved !== null ? JSON.parse(saved) : true
  })
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    if (!role) navigate("/login", { replace: true })
  }, [navigate, role])

  useEffect(() => {
    if (role) {
      document.title = `${role.charAt(0).toUpperCase() + role.slice(1)} - ETracking`
    } else {
      document.title = "ETracking"
    }
  }, [role])

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark-mode")
    } else {
      document.documentElement.classList.remove("dark-mode")
    }
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode))
  }, [isDarkMode])

    useEffect(() => {
  async function loadNotificationCount() {
    try {
      const rolePath = role === 'admin' ? '/api/notifications' : `/api/${role}/notifications`;
      const data = await apiCall(rolePath);

      // 👇 handle both { data: { notifications } } and { notifications }
      const list = data?.data?.notifications || data?.notifications || [];
      setNotificationCount(list.length);
    } catch (err) {
      console.error("Failed to load notification count:", err);
    }
  }

  loadNotificationCount();
  const interval = setInterval(loadNotificationCount, 5000);
  return () => clearInterval(interval);
}, [role]);

  const handleLogout = () => {
    clearAuth()
    navigate("/login", { replace: true })
    setTimeout(() => window.location.reload(), 20)
  }

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev)
  }

  const links = {
    admin: [
      { to: "dashboard", label: "Dashboard" },
      { to: "customers", label: "Customers" },
      { to: "orders", label: "Orders" },
      { to: "vendors", label: "Vendors" },
      { to: "analytics", label: "Analytics" },
      { to: "notifications", label: "Notifications" },
    ],
    vendor: [
      { to: "dashboard", label: "Dashboard" },
      { to: "orders", label: "Orders" },
      { to: "analytics", label: "Analytics" },
      { to: "profile", label: "Profile" },
      { to: "notifications", label: "Notifications" },
    ],
    customer: [
      { to: "dashboard", label: "Dashboard" },
      { to: "orders", label: "Orders" },
      { to: "profile", label: "Profile" },
      { to: "notifications", label: "Notifications" },
    ],
  }

  const username = (() => {
    try {
      const u = localStorage.getItem("user") || sessionStorage.getItem("user")
      return u ? JSON.parse(u).username : null
    } catch {
      return null
    }
  })()

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`} aria-hidden={!open && window.innerWidth < 880}>
        <div className="sidebar-inner">
          <div className="brand">TrackJourney</div>
          <nav>
            {(links[role] || []).map((l) => (
              <NavLink key={l.to} to={l.to} className="side-link" onClick={() => setOpen(false)}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="who">
              Signed in as <strong>{username ?? role}</strong>
            </div>

            <button
              className="dark-mode-toggle"
              onClick={handleToggleDarkMode}
              aria-label="Toggle dark mode"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? (
                <>
                  <span className="toggle-icon">☀️</span>
                  <span className="toggle-text">Light Mode</span>
                </>
              ) : (
                <>
                  <span className="toggle-icon">🌙</span>
                  <span className="toggle-text">Dark Mode</span>
                </>
              )}
            </button>

            <button className="logout-btn sidebar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </aside>

      {open && <div className="sidebar-overlay" onClick={() => setOpen(false)} />}

      <div className="main-area">
        <header className="topbar">
          <button className="hamburger" aria-label="Open menu" onClick={() => setOpen((v) => !v)}>
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>

          <div className="topbar-right">
            <button
              className="notification-bell"
              onClick={() => navigate(`/${role}/notifications`)}
              title="View Notifications"
              aria-label="Notifications"
            >
              🔔
              {notificationCount > 0 && (
                <span className="notification-badge">{notificationCount > 9 ? "9+" : notificationCount}</span>
              )}
            </button>
            <div className="role-label">{role?.toUpperCase() || ""}</div>
            <button className="logout-btn topbar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout

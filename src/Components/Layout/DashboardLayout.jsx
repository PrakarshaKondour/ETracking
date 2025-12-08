"use client"

import React, { useEffect, useState } from "react"
import { Outlet, useNavigate, NavLink } from "react-router-dom"
import { apiCall } from "../../utils/api"
import "./Layout.css"
import { clearAuth, getUserRole, onAuthChange } from "../../utils/auth"

const DashboardLayout = () => {
  const navigate = useNavigate()
  const role = getUserRole()
  const [open, setOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode")
    return saved !== null ? JSON.parse(saved) : true
  })
  const [notificationCount, setNotificationCount] = useState(0)
  const [user, setUser] = useState(null)

  const [logoutModal, setLogoutModal] = useState(false)
  const [logoutReason, setLogoutReason] = useState("")
  // ✅ NEW: track if this is a manual logout (user clicked button)
  const [isManualLogout, setIsManualLogout] = useState(false)

  useEffect(() => {
    // Get user from storage
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user")
    const userData = userStr ? JSON.parse(userStr) : null
    setUser(userData)
  }, [])

  // ✅ Listen for auth state changes (multi-tab login detection)
  useEffect(() => {
    const handleAuthChange = () => {
      const currentRole = getUserRole()
      const userStr = localStorage.getItem("user") || sessionStorage.getItem("user")
      const currentUser = userStr ? JSON.parse(userStr) : null

      // If there's no role but we had one, we were logged out from another tab
      if (!currentRole && role) {
        console.log("⚠️ You were logged out from another tab")
        setIsManualLogout(false) // it's an automatic logout
        setLogoutReason("You were logged in from another tab. Please log in again.")
        setLogoutModal(true)
        return
      }

      // If auth changed and we're still logged in, refresh user data
      if (currentUser && currentUser.username !== user?.username) {
        setUser(currentUser)
        console.log("🔄 Auth state synced with other tab")
      }
    }

    onAuthChange(handleAuthChange)
  }, [role, user])

  useEffect(() => {
    if (!role && !logoutModal) navigate("/login", { replace: true })
  }, [navigate, role, logoutModal])

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

  // Load notification count
  useEffect(() => {
    async function loadNotificationCount() {
      try {
        if (!user) return

        // Build role-specific endpoint
        const endpoint = user.role === "admin" ? "/api/notifications" : `/api/${user.role}/notifications`

        const data = await apiCall(endpoint)
        setNotificationCount((data?.data?.notifications || []).length)
      } catch (err) {
        console.error("Failed to load notification count:", err)
        setNotificationCount(0)
      }
    }

    loadNotificationCount()

    // Poll every 5 seconds
    const interval = setInterval(loadNotificationCount, 5000)
    return () => clearInterval(interval)
  }, [user])

  // ❌ OLD: direct logout
  // const handleLogout = () => {
  //   clearAuth()
  //   navigate("/login", { replace: true })
  //   setTimeout(() => window.location.reload(), 20)
  // }

  // ✅ NEW: when user clicks Logout, open confirmation popup
  const handleLogout = () => {
    setIsManualLogout(true)
    setLogoutReason("Are you sure you want to log out of this session?")
    setLogoutModal(true)
  }

  const handleToggleDarkMode = () => {
    setIsDarkMode((prev) => !prev)
  }

  // ✅ Handle logout modal primary action
  const handleModalLogout = () => {
    setLogoutModal(false)
    setIsManualLogout(false)
    clearAuth()
    navigate("/login", { replace: true })
    setTimeout(() => window.location.reload(), 20)
  }

  // ✅ NEW: Cancel button for manual logout
  const handleCancelLogout = () => {
    setLogoutModal(false)
    setIsManualLogout(false)
    setLogoutReason("")
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

  if (!user && !logoutModal) {
    return <div>Loading…</div>
  }

  return (
    <>
      {/* ✅ Logout / Session Modal Dialog */}
      {logoutModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.92)",
            backdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: isDarkMode ? "#1f2933" : "#ffffff",
              color: isDarkMode ? "#ffffff" : "#0f172a",
              borderRadius: 12,
              padding: 32,
              maxWidth: 400,
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h2 style={{ margin: "0 0 12px 0" }}>
              {isManualLogout ? "Log out?" : "Session Ended"}
            </h2>
            <p
              style={{
                color: isManualLogout
                  ? isDarkMode
                    ? "#cbd5f5"
                    : "#374151"
                  : "#ffffff",
                background: !isManualLogout ? "rgba(255,255,255,0.08)" : "transparent",
                padding: !isManualLogout ? "8px 10px" : "0",
                borderRadius: 6,
                marginBottom: 24,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {logoutReason ||
                (isManualLogout
                  ? "Are you sure you want to end this session?"
                  : "Your session has ended. Please log in again.")}
            </p>

            {isManualLogout ? (
              // Manual logout → confirm + cancel buttons
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  onClick={handleCancelLogout}
                  style={{
                    padding: "10px 24px",
                    background: "transparent",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                  }}
                >
                  Stay Logged In
                </button>
                <button
                  onClick={handleModalLogout}
                  style={{
                    padding: "10px 24px",
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  Logout
                </button>
              </div>
            ) : (
              // Auto logout from another tab → single CTA
              <button
                onClick={handleModalLogout}
                style={{
                  padding: "10px 24px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                Go to Login
              </button>
            )}
          </div>
        </div>
      )}

      <div className="app-shell">
        <aside
          className={`sidebar ${open ? "open" : ""}`}
          aria-hidden={!open && window.innerWidth < 880}
        >
          <div className="sidebar-inner">
            <div className="brand">TrackJourney</div>
            <nav>
              {(links[role] || []).map((l) => (
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
            <button
              className="hamburger"
              aria-label="Open menu"
              onClick={() => setOpen((v) => !v)}
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>

            <div className="topbar-right">
              <button
                className="notification-bell"
                onClick={() => navigate(`/${user?.role || role}/notifications`)}
                title="View Notifications"
                aria-label="Notifications"
              >
                🔔
                {notificationCount > 0 && (
                  <span className="notification-badge">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                )}
              </button>
              <div className="role-label">{role?.toUpperCase() || ""}</div>
              <button className="logout-btn topbar-logout" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </header>

          <main className="content">{user && <Outlet />}</main>
        </div>
      </div>
    </>
  )
}

export default DashboardLayout

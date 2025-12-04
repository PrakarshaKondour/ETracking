"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"
import { getUserRole } from "../../utils/auth"

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [role, setRole] = useState(getUserRole() || "admin")

  // sync dark mode
  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true"
    setIsDarkMode(isDark)
  }, [])

  // sync role in case auth changes
  useEffect(() => {
    const r = getUserRole() || "admin"
    setRole(r)
  }, [])

  // load notifications + (admin-only) SSE
  useEffect(() => {
    if (!role) return

    let es

    async function loadNotifications() {
        try {
            const path =
            role === "admin" ? "/api/notifications" : `/api/${role}/notifications`
            const data = await apiCall(path)

            // 👇 Try both shapes: { data: { notifications } } and { notifications }
            const list = data?.data?.notifications || data?.notifications || []
            setNotifications(list)
        } catch (err) {
            console.error("Failed to load notifications:", err)
        } finally {
            setLoading(false)
        }
    }


    loadNotifications()

    // SSE: only for admin
    try {
      if (role === "admin") {
        const API = process.env.REACT_APP_API_URL || "http://localhost:5000"
        const token =
          localStorage.getItem("authToken") ||
          sessionStorage.getItem("authToken")
        if (token) {
          es = new EventSource(`${API}/api/notifications/stream?token=${token}`)
          es.addEventListener("notification", (e) => {
            try {
              const payload = JSON.parse(e.data)
              if (payload.type === "order.updated" && payload.data?.removed) {
                setNotifications((prev) =>
                  prev.filter(
                    (n) =>
                      !(
                        n._notifType === "order_delayed_escalation" &&
                        n.data?.orderId === payload.data.orderId
                      ),
                  ),
                )
              } else if (payload.type === "order.delayed_escalation") {
                setNotifications((prev) => [
                  {
                    _notifType: "order_delayed_escalation",
                    data: payload.data,
                    timestamp: new Date().toISOString(),
                  },
                  ...prev,
                ])
              }
            } catch (e) {
              console.error("SSE parse error", e)
            }
          })
          es.onerror = (err) => {
            console.error("SSE error", err)
          }
        }
      }
    } catch (e) {
      console.warn("Failed to open SSE stream:", e)
    }

    const interval = setInterval(loadNotifications, 10000)
    return () => {
      clearInterval(interval)
      try {
        es && es.close()
      } catch (e) {}
    }
  }, [role])

  const handleClearAll = async () => {
    try {
      setClearing(true)

      const currentRole = getUserRole() || role || "admin"
      const path =
        currentRole === "admin"
          ? "/api/notifications"
          : `/api/${currentRole}/notifications`

      await apiCall(path, { method: "DELETE" })
      setNotifications([])
    } catch (err) {
      console.error("Failed to clear notifications:", err)
      window.alert("Failed to clear notifications")
    } finally {
      setClearing(false)
    }
  }

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading notifications…</div>
      </div>
    )

  const isAdmin = role === "admin"

  return (
    <div className="page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2>Notifications</h2>
          <p className="page-subtitle">Your alerts and important updates</p>
        </div>
        {notifications.length > 0 && (
          <button className="btn secondary" onClick={handleClearAll} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear All"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "48px 24px" }}>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px" }}>
            No notifications yet
          </p>
        </div>
      ) : isAdmin ? (
        // ---------- ADMIN VIEW ----------
        <>
          {notifications.filter((n) => n._notifType === "order_delayed_escalation").length > 0 && (
            <div className="panel" style={{ marginBottom: "20px", borderLeft: "4px solid #ef4444" }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: isDarkMode ? "#e8f4f8" : "#0f1419",
                }}
              >
                Delayed Orders (Escalated)
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#ef4444",
                  }}
                >
                  {notifications.filter((n) => n._notifType === "order_delayed_escalation").length}
                </span>
              </h3>
              <div style={{ marginTop: "12px" }}>
                {notifications
                  .filter((n) => n._notifType === "order_delayed_escalation")
                  .map((notif, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        marginBottom: "8px",
                        backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "#fff5f5",
                        borderRadius: "4px",
                        borderLeft: "3px solid #ef4444",
                        color: isDarkMode ? "#e8f4f8" : "#0f1419",
                      }}
                    >
                      <div style={{ fontWeight: "700" }}>Order ID: {notif.data?.orderId}</div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#a0b0c0" : "#555",
                          marginTop: "4px",
                        }}
                      >
                        Vendor: {notif.data?.vendorUsername}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#a0b0c0" : "#555",
                        }}
                      >
                        Customer: {notif.data?.customerUsername}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#a0b0c0" : "#555",
                        }}
                      >
                        Status: {notif.data?.status}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: isDarkMode ? "#7a8a9a" : "#888",
                          marginTop: "8px",
                        }}
                      >
                        Created:{" "}
                        {notif.data?.createdAt
                          ? new Date(notif.data.createdAt).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {notifications.filter((n) => n._notifType === "vendor_registration").length > 0 && (
            <div className="panel" style={{ marginBottom: "20px", borderLeft: "4px solid #f59e0b" }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: isDarkMode ? "#e8f4f8" : "#0f1419",
                }}
              >
                Pending Vendor Approvals
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    color: "#f59e0b",
                  }}
                >
                  {notifications.filter((n) => n._notifType === "vendor_registration").length}
                </span>
              </h3>
              <div style={{ marginTop: "12px" }}>
                {notifications
                  .filter((n) => n._notifType === "vendor_registration")
                  .map((notif, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "12px",
                        marginBottom: "8px",
                        backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.1)" : "#fef3c7",
                        borderRadius: "4px",
                        borderLeft: "3px solid #f59e0b",
                        color: isDarkMode ? "#e8f4f8" : "#0f1419",
                      }}
                    >
                      <div style={{ fontWeight: "bold" }}>
                        {notif.data?.companyName || "New Vendor"}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#a0b0c0" : "#555",
                          marginTop: "4px",
                        }}
                      >
                        Username: {notif.data?.username}
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#a0b0c0" : "#555",
                        }}
                      >
                        Email: {notif.data?.email}
                      </div>
                      {notif.data?.phone && (
                        <div
                          style={{
                            fontSize: "14px",
                            color: isDarkMode ? "#a0b0c0" : "#555",
                          }}
                        >
                          Phone: {notif.data?.phone}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: "12px",
                          color: isDarkMode ? "#7a8a9a" : "#888",
                          marginTop: "8px",
                        }}
                      >
                        Registered:{" "}
                        {notif.timestamp
                          ? new Date(notif.timestamp).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      ) : (
        // ---------- VENDOR / CUSTOMER VIEW ----------
        <div className="panel">
          <h3 style={{ marginTop: 0 }}>
            {role === "vendor" ? "Vendor Notifications" : "Your Notifications"}
          </h3>
          <div style={{ marginTop: 12 }}>
            {notifications.map((notif, idx) => {
              const ts =
                notif.timestamp ||
                notif.createdAt ||
                notif.data?.createdAt ||
                null

              const title =
                notif.title ||
                notif._notifType ||
                notif.type ||
                (role === "vendor" ? "Order Update" : "Update")

              const message =
                notif.message ||
                notif.data?.message ||
                notif.description ||
                ""

              return (
                <div
                  key={idx}
                  style={{
                    padding: "12px",
                    marginBottom: "10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    backgroundColor: isDarkMode ? "rgba(15, 23, 42, 0.9)" : "#ffffff",
                  }}
                >
                  <div style={{ fontWeight: "600", marginBottom: 4 }}>{title}</div>
                  {message && (
                    <div
                      style={{
                        fontSize: 13,
                        color: isDarkMode ? "#cbd5f5" : "#4b5563",
                        marginBottom: 4,
                      }}
                    >
                      {message}
                    </div>
                  )}

                  {notif.data && !message && (
                    <div
                      style={{
                        fontSize: 12,
                        color: isDarkMode ? "#9ca3af" : "#6b7280",
                        whiteSpace: "pre-wrap",
                        marginTop: 4,
                      }}
                    >
                      {JSON.stringify(notif.data, null, 2)}
                    </div>
                  )}

                  {ts && (
                    <div
                      style={{
                        fontSize: 11,
                        color: isDarkMode ? "#9ca3af" : "#9ca3af",
                        marginTop: 6,
                      }}
                    >
                      {new Date(ts).toLocaleString()}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default Notifications

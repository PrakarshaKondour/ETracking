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
      } catch (e) { }
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
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔔</div>
          <p style={{ color: "var(--text-secondary)", fontSize: "16px", margin: 0 }}>
            No notifications yet
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginTop: "8px" }}>
            You're all caught up!
          </p>
        </div>
      ) : isAdmin ? (
        // ---------- ADMIN VIEW ----------
        <>
          {notifications.filter((n) => n._notifType === "order_delayed_escalation").length > 0 && (
            <div className="panel" style={{
              marginBottom: "20px",
              borderLeft: "4px solid #ef4444",
              background: isDarkMode
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)"
                : "linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)",
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.1)"
            }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: isDarkMode ? "#fca5a5" : "#dc2626",
                  marginTop: 0
                }}
              >
                <span style={{ fontSize: "20px" }}>⚠️</span>
                Delayed Orders (Escalated)
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    background: "#ef4444",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "12px",
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
                        padding: "16px",
                        marginBottom: "12px",
                        backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.15)" : "#ffffff",
                        borderRadius: "8px",
                        borderLeft: "3px solid #ef4444",
                        color: isDarkMode ? "#e8f4f8" : "#0f1419",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(4px)"
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(239, 68, 68, 0.2)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)"
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px" }}>📦</span>
                        <div style={{ fontWeight: "700", fontSize: "15px" }}>Order ID: {notif.data?.orderId}</div>
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#cbd5e1" : "#64748b",
                          marginTop: "6px",
                          display: "grid",
                          gap: "4px"
                        }}
                      >
                        <div>👤 Vendor: <strong>{notif.data?.vendorUsername}</strong></div>
                        <div>🛒 Customer: <strong>{notif.data?.customerUsername}</strong></div>
                        <div>📊 Status: <strong>{notif.data?.status}</strong></div>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: isDarkMode ? "#94a3b8" : "#94a3b8",
                          marginTop: "12px",
                          paddingTop: "8px",
                          borderTop: `1px solid ${isDarkMode ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.3)"}`,
                        }}
                      >
                        🕐 Created:{" "}
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
            <div className="panel" style={{
              marginBottom: "20px",
              borderLeft: "4px solid #f59e0b",
              background: isDarkMode
                ? "linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)"
                : "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              boxShadow: "0 2px 8px rgba(245, 158, 11, 0.1)"
            }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: isDarkMode ? "#fcd34d" : "#d97706",
                  marginTop: 0
                }}
              >
                <span style={{ fontSize: "20px" }}>👥</span>
                Pending Vendor Approvals
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    background: "#f59e0b",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "12px",
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
                        padding: "16px",
                        marginBottom: "12px",
                        backgroundColor: isDarkMode ? "rgba(245, 158, 11, 0.15)" : "#ffffff",
                        borderRadius: "8px",
                        borderLeft: "3px solid #f59e0b",
                        color: isDarkMode ? "#e8f4f8" : "#0f1419",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateX(4px)"
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(245, 158, 11, 0.2)"
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateX(0)"
                        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px" }}>🏢</span>
                        <div style={{ fontWeight: "700", fontSize: "15px" }}>
                          {notif.data?.companyName || "New Vendor"}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: isDarkMode ? "#cbd5e1" : "#64748b",
                          marginTop: "6px",
                          display: "grid",
                          gap: "4px"
                        }}
                      >
                        <div>👤 Username: <strong>{notif.data?.username}</strong></div>
                        <div>📧 Email: <strong>{notif.data?.email}</strong></div>
                        {notif.data?.phone && (
                          <div>📞 Phone: <strong>{notif.data?.phone}</strong></div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: isDarkMode ? "#94a3b8" : "#94a3b8",
                          marginTop: "12px",
                          paddingTop: "8px",
                          borderTop: `1px solid ${isDarkMode ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.3)"}`,
                        }}
                      >
                        🕐 Registered:{" "}
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
        <div style={{ display: "grid", gap: "12px" }}>
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

            // Determine notification type for styling
            const isDelayed = notif._notifType === "order_delayed_escalation" || title.toLowerCase().includes("delay")
            const isUrgent = notif.priority === "high" || isDelayed

            const borderColor = isUrgent ? "#ef4444" : "#3b82f6"
            const iconEmoji = isDelayed ? "⏱️" : "📬"

            return (
              <div
                key={idx}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: `1px solid ${isDarkMode ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.3)"}`,
                  borderLeft: `4px solid ${borderColor}`,
                  backgroundColor: isDarkMode
                    ? "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)"
                  e.currentTarget.style.boxShadow = `0 4px 12px ${isUrgent ? "rgba(239, 68, 68, 0.2)" : "rgba(59, 130, 246, 0.2)"}`
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.1)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{iconEmoji}</span>
                  <div style={{
                    fontWeight: "600",
                    fontSize: "15px",
                    color: isDarkMode ? "#e2e8f0" : "#0f172a"
                  }}>
                    {title}
                  </div>
                  {isUrgent && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      background: "#ef4444",
                      color: "white",
                      padding: "2px 6px",
                      borderRadius: "10px",
                      marginLeft: "auto"
                    }}>
                      URGENT
                    </span>
                  )}
                </div>
                {message && (
                  <div
                    style={{
                      fontSize: "14px",
                      color: isDarkMode ? "#cbd5e1" : "#475569",
                      marginBottom: "8px",
                      lineHeight: "1.5"
                    }}
                  >
                    {message}
                  </div>
                )}

                {notif.data && !message && (
                  <div style={{ marginTop: "12px" }}>
                    {notif.data.orderId ? (
                      <div style={{
                        display: "grid",
                        gap: "8px",
                        fontSize: "14px",
                        color: isDarkMode ? "#cbd5e1" : "#475569",
                        background: isDarkMode ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)",
                        padding: "12px",
                        borderRadius: "6px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>Order ID:</span>
                          <span style={{ fontWeight: "600", fontFamily: "monospace" }}>{notif.data.orderId}</span>
                        </div>

                        {notif.data.status && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>Status:</span>
                            <span style={{
                              fontWeight: "600",
                              textTransform: "capitalize",
                              color: notif.data.status === 'delivered' ? '#10b981' :
                                notif.data.status === 'cancelled' ? '#ef4444' : '#3b82f6'
                            }}>
                              {notif.data.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}

                        {notif.data.total && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>Total:</span>
                            <span style={{ fontWeight: "600" }}>${Number(notif.data.total).toFixed(2)}</span>
                          </div>
                        )}

                        {role === 'vendor' && notif.data.customerUsername && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>Customer:</span>
                            <span style={{ fontWeight: "500" }}>{notif.data.customerUsername}</span>
                          </div>
                        )}

                        {role === 'customer' && notif.data.vendorUsername && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: isDarkMode ? "#94a3b8" : "#64748b" }}>Vendor:</span>
                            <span style={{ fontWeight: "500" }}>{notif.data.vendorUsername}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "13px",
                          color: isDarkMode ? "#94a3b8" : "#64748b",
                          whiteSpace: "pre-wrap",
                          background: isDarkMode ? "rgba(0, 0, 0, 0.2)" : "rgba(0, 0, 0, 0.03)",
                          padding: "8px",
                          borderRadius: "4px",
                          fontFamily: "monospace"
                        }}
                      >
                        {JSON.stringify(notif.data, null, 2)}
                      </div>
                    )}
                  </div>
                )}

                {ts && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: isDarkMode ? "#94a3b8" : "#94a3b8",
                      marginTop: "12px",
                      paddingTop: "8px",
                      borderTop: `1px solid ${isDarkMode ? "rgba(148, 163, 184, 0.2)" : "rgba(148, 163, 184, 0.3)"}`,
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <span>🕐</span>
                    {new Date(ts).toLocaleString()}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Notifications

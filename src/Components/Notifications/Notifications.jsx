"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"
import { getUserRole } from "../../utils/auth"

const Notifications = () => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const [role, setRole] = useState(getUserRole() || "admin")

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
        <div className="panel" style={{ color: "var(--text-primary)" }}>Loading notifications…</div>
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
          <h2 style={{ color: "var(--text-primary)" }}>Notifications</h2>
          <p className="page-subtitle" style={{ color: "var(--text-secondary)" }}>Your alerts and important updates</p>
        </div>
        {notifications.length > 0 && (
          <button className="btn secondary" onClick={handleClearAll} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear All"}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="panel" style={{ textAlign: "center", padding: "48px 24px", background: "var(--bg-panel)" }}>
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
          {/* 1. Delayed Orders (Red) */}
          {notifications.filter((n) => n._notifType === "order_delayed_escalation").length > 0 && (
            <div className="panel" style={{
              marginBottom: "20px",
              borderLeft: "4px solid var(--danger-color)",
              background: "var(--bg-panel)",
              boxShadow: "var(--notification-shadow)"
            }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--danger-color)",
                  marginTop: 0
                }}
              >
                <span style={{ fontSize: "20px" }}>⚠️</span>
                Delayed Orders (Escalated)
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    background: "var(--danger-color)",
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
                        background: "rgba(239, 68, 68, 0.05)", // slightly tinted background for item
                        borderRadius: "8px",
                        borderLeft: "3px solid var(--danger-color)",
                        color: "var(--text-primary)",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px" }}>📦</span>
                        <div style={{ fontWeight: "700", fontSize: "15px" }}>Order ID: {notif.data?.orderId}</div>
                      </div>
                      <div
                        style={{
                          fontSize: "14px",
                          color: "var(--text-secondary)",
                          marginTop: "6px",
                          display: "grid",
                          gap: "4px"
                        }}
                      >
                        <div>👤 Vendor: <strong style={{ color: "var(--text-primary)" }}>{notif.data?.vendorUsername}</strong></div>
                        <div>🛒 Customer: <strong style={{ color: "var(--text-primary)" }}>{notif.data?.customerUsername}</strong></div>
                        <div>📊 Status: <strong style={{ color: "var(--text-primary)" }}>{notif.data?.status}</strong></div>
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "12px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-color)",
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

          {/* 2. Order Updates / Reverts (Blue/Accent) */}
          {notifications.filter((n) => n._notifType === "order_update").length > 0 && (
            <div className="panel" style={{
              marginBottom: "20px",
              borderLeft: "4px solid var(--accent-color)",
              background: "var(--bg-panel)",
              boxShadow: "var(--notification-shadow)"
            }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--accent-color)",
                  marginTop: 0
                }}
              >
                <span style={{ fontSize: "20px" }}>ℹ️</span>
                Order Updates
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    background: "var(--accent-color)",
                    color: "white",
                    padding: "2px 8px",
                    borderRadius: "12px",
                  }}
                >
                  {notifications.filter((n) => n._notifType === "order_update").length}
                </span>
              </h3>
              <div style={{ marginTop: "12px" }}>
                {notifications
                  .filter((n) => n._notifType === "order_update")
                  .map((notif, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "16px",
                        marginBottom: "12px",
                        background: "rgba(59, 130, 246, 0.05)",
                        borderRadius: "8px",
                        borderLeft: "3px solid var(--accent-color)",
                        color: "var(--text-primary)",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "18px" }}>🔄</span>
                        <div style={{ fontWeight: "700", fontSize: "15px" }}>{notif.title || "Update"}</div>
                      </div>
                      <div style={{
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        marginBottom: "8px",
                        lineHeight: "1.5"
                      }}>
                        {notif.message}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "8px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-color)",
                        }}
                      >
                        🕐 {notif.timestamp ? new Date(notif.timestamp).toLocaleString() : ""}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 3. Vendor Registrations (Yellow/Warning) */}
          {notifications.filter((n) => n._notifType === "vendor_registration").length > 0 && (
            <div className="panel" style={{
              marginBottom: "20px",
              borderLeft: "4px solid var(--warning-color)",
              background: "var(--bg-panel)",
              boxShadow: "var(--notification-shadow)"
            }}>
              <h3
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  color: "var(--warning-color)",
                  marginTop: 0
                }}
              >
                <span style={{ fontSize: "20px" }}>👥</span>
                Pending Vendor Approvals
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    background: "var(--warning-color)",
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
                        background: "rgba(245, 158, 11, 0.05)",
                        borderRadius: "8px",
                        borderLeft: "3px solid var(--warning-color)",
                        color: "var(--text-primary)",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.2s ease",
                        cursor: "pointer",
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
                          color: "var(--text-secondary)",
                          marginTop: "6px",
                          display: "grid",
                          gap: "4px"
                        }}
                      >
                        <div>👤 Username: <strong style={{ color: "var(--text-primary)" }}>{notif.data?.username}</strong></div>
                        <div>📧 Email: <strong style={{ color: "var(--text-primary)" }}>{notif.data?.email}</strong></div>
                        {notif.data?.phone && (
                          <div>📞 Phone: <strong style={{ color: "var(--text-primary)" }}>{notif.data?.phone}</strong></div>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--text-secondary)",
                          marginTop: "12px",
                          paddingTop: "8px",
                          borderTop: "1px solid var(--border-color)",
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
            const isUrgent = notif.priority === "high" || isDelayed || notif.event === 'order.status_reverted'

            const borderColor = isUrgent ? "var(--danger-color)" : "var(--accent-color)"
            const iconEmoji = isDelayed ? "⏱️" : isUrgent ? "⚠️" : "📬"

            return (
              <div
                key={idx}
                style={{
                  padding: "16px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  borderLeft: `4px solid ${borderColor}`,
                  background: "var(--bg-panel)",
                  boxShadow: "var(--notification-shadow)",
                  transition: "all 0.2s ease",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)"
                  e.currentTarget.style.boxShadow = "var(--notification-shadow-hover)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)"
                  e.currentTarget.style.boxShadow = "var(--notification-shadow)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "20px" }}>{iconEmoji}</span>
                  <div style={{
                    fontWeight: "600",
                    fontSize: "15px",
                    color: "var(--text-primary)"
                  }}>
                    {title}
                  </div>
                  {isUrgent && (
                    <span style={{
                      fontSize: "11px",
                      fontWeight: "bold",
                      background: "var(--danger-color)",
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
                      color: "var(--text-secondary)",
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
                        color: "var(--text-secondary)",
                        background: "rgba(0,0,0,0.03)", // kept simple
                        padding: "12px",
                        borderRadius: "6px",
                        border: "1px solid var(--border-color)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "var(--text-secondary)" }}>Order ID:</span>
                          <span style={{ fontWeight: "600", fontFamily: "monospace", color: "var(--text-primary)" }}>{notif.data.orderId}</span>
                        </div>

                        {notif.data.status && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Status:</span>
                            <span style={{
                              fontWeight: "600",
                              textTransform: "capitalize",
                              color: notif.data.status === 'delivered' ? 'var(--success-color)' :
                                notif.data.status === 'cancelled' ? 'var(--danger-color)' : 'var(--accent-color)'
                            }}>
                              {notif.data.status.replace(/_/g, ' ')}
                            </span>
                          </div>
                        )}

                        {notif.data.total && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Total:</span>
                            <span style={{ fontWeight: "600", color: "var(--text-primary)" }}>${Number(notif.data.total).toFixed(2)}</span>
                          </div>
                        )}

                        {role === 'vendor' && notif.data.customerUsername && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Customer:</span>
                            <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{notif.data.customerUsername}</span>
                          </div>
                        )}

                        {role === 'customer' && notif.data.vendorUsername && (
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--text-secondary)" }}>Vendor:</span>
                            <span style={{ fontWeight: "500", color: "var(--text-primary)" }}>{notif.data.vendorUsername}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "var(--text-secondary)",
                          whiteSpace: "pre-wrap",
                          background: "rgba(0, 0, 0, 0.03)",
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
                      color: "var(--text-secondary)",
                      marginTop: "12px",
                      paddingTop: "8px",
                      borderTop: "1px solid var(--border-color)",
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

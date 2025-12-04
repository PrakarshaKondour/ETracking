"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      try {
        const data = await apiCall("/api/admin/dashboard")
        setStats(data?.data?.stats || null)
      } catch (err) {
        console.error(err)
        setError(err.message || "Failed to load dashboard")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading…</div>
      </div>
    )
  if (error)
    return (
      <div className="page">
        <div className="panel" style={{ color: "#ef4444" }}>
          {error}
        </div>
      </div>
    )

  return (
    <div className="page">
      <div>
        <h2>System Overview</h2>
        <p className="page-subtitle">Real-time insights into platform activity and growth metrics</p>
      </div>

      {/* Pending Vendor Registrations Section */}
      {notifications.length > 0 && (
        <div className="panel" style={{ marginBottom: "20px", borderLeft: "4px solid #f59e0b" }}>
          <h3 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            🔔 Pending Vendor Approvals
            <span style={{ fontSize: "14px", fontWeight: "bold", color: "#f59e0b" }}>
              {notifications.length}
            </span>
          </h3>
          <div style={{ marginTop: "12px" }}>
            {notifications.map((notif, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px",
                  marginBottom: "8px",
                  backgroundColor: "#fef3c7",
                  borderRadius: "4px",
                  borderLeft: "3px solid #f59e0b",
                }}
              >
                <div style={{ fontWeight: "bold" }}>{notif.data?.companyName || "New Vendor"}</div>
                <div style={{ fontSize: "14px", color: "#555" }}>
                  Username: {notif.data?.username}
                </div>
                <div style={{ fontSize: "14px", color: "#555" }}>
                  Email: {notif.data?.email}
                </div>
                {notif.data?.phone && (
                  <div style={{ fontSize: "14px", color: "#555" }}>
                    Phone: {notif.data?.phone}
                  </div>
                )}
                <div style={{ fontSize: "12px", color: "#888", marginTop: "8px" }}>
                  Registered: {new Date(notif.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid">
        <div className="panel stat">
          <h4>Platform Administrators</h4>
          <div>{stats?.admins ?? "—"}</div>
          <div className="stat-description">Active admin accounts managing the platform</div>
        </div>
        <div className="panel stat">
          <h4>Active Vendors</h4>
          <div>{stats?.vendors ?? "—"}</div>
          <div className="stat-description">Registered sellers on the marketplace</div>
        </div>
        <div className="panel stat">
          <h4>Total Customers</h4>
          <div>{stats?.customers ?? "—"}</div>
          <div className="stat-description">Registered buyer accounts</div>
        </div>
        <div className="panel stat">
          <h4>Orders Processed</h4>
          <div>{stats?.orders ?? "—"}</div>
          <div className="stat-description">Total transactions on platform</div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

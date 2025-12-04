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

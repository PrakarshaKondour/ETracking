"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"

const prettyStatus = (status) => {
  const s = status || "ordered"
  return s
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const AdminOrders = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(`${API}/api/admin/orders`, { headers })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        if (!res.ok) setErr(json.message || "Failed to load orders")
        else setData(json.data || [])
      } catch (e) {
        if (!mounted) return
        setErr("Network error")
        console.error(e)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [API])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading orders…</div>
      </div>
    )

  if (err)
    return (
      <div className="page">
        <div className="panel" style={{ color: "#ef4444" }}>
          {err}
        </div>
      </div>
    )

  if (!data.length)
    return (
      <div className="page">
        <h2>Order Management</h2>
        <p className="page-subtitle">Track and manage all customer orders</p>
        <div className="panel">No orders found.</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Order Management</h2>
      <p className="page-subtitle">View all orders • {data.length} total orders</p>

      <div className="orders-grid">
        {data.map((o) => {
          const status = o.status || "ordered"

          return (
            <div key={o._id} className="order-card-new">
              <div className="order-card-header-new">
                <div className="order-id">#{o._id.slice(-8).toUpperCase()}</div>
                <div className="order-amount">${(o.total || 0).toFixed(2)}</div>
              </div>

              <div className="order-details">
                <div className="order-detail-row">
                  <span className="order-detail-label">Customer</span>
                  <span className="order-detail-value">{o.customerUsername}</span>
                </div>
                <div className="order-detail-row">
                  <span className="order-detail-label">Vendor</span>
                  <span className="order-detail-value">{o.vendorUsername}</span>
                </div>
                <div className="order-detail-row">
                  <span className="order-detail-label">Items</span>
                  <span className="order-detail-value">{o.items?.length || 0}</span>
                </div>
                <div className="order-detail-row">
                  <span className="order-detail-label">Date</span>
                  <span className="order-detail-value">
                    {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>

              <div className="order-status-section">
                <div className="order-status-display">
                  <span className="order-status-label">Status</span>
                  <span className={`order-status-badge-new ${status}`}>
                    {prettyStatus(status)}
                  </span>
                </div>

                {/* Read-only note */}
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: "700",
                  }}
                >
                  Status managed by vendor
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AdminOrders

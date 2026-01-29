"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../Components/Layout/Page.css"
import { ORDER_STATUS_FLOW, PRETTY_STATUS } from "../../constants/orderStatus"

const AdminOrders = () => {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000"
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        const headers = token ? { Authorization: `Bearer ${token}` } : {}

        const res = await fetch(`${API}/api/admin/orders`, { headers })
        const json = await res.json().catch(() => ({}))

        if (!mounted) return

        if (!res.ok) {
          setErr(json.message || "Failed to load orders")
          setData([])
        } else {
          setData(json.data || [])
        }
      } catch (e) {
        console.error(e)
        if (!mounted) return
        setErr("Network error")
        setData([])
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [API])

  if (loading) {
    return (
      <div className="page">
        <div className="panel">Loading orders…</div>
      </div>
    )
  }

  if (err) {
    return (
      <div className="page">
        <div className="panel" style={{ color: "#ef4444" }}>
          {err}
        </div>
      </div>
    )
  }

  if (!data.length) {
    return (
      <div className="page">
        <h2>Order Management</h2>
        <p className="page-subtitle">Track and manage all customer orders</p>
        <div className="panel">No orders found.</div>
      </div>
    )
  }

  const filteredData = data.filter((o) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false

    if (startDate && new Date(o.createdAt) < new Date(startDate)) return false

    if (endDate) {
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      if (new Date(o.createdAt) > end) return false
    }

    return true
  })

  return (
    <div className="page">
      <h2>Order Management</h2>
      <p className="page-subtitle">View all orders • {data.length} total orders</p>

      {/* Filters */}
      <div
        className="panel"
        style={{
          marginBottom: "24px",
          display: "flex",
          gap: "16px",
          flexWrap: "wrap",
          alignItems: "end",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              minWidth: "150px",
            }}
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUS_FLOW.map((s) => (
              <option key={s} value={s}>
                {PRETTY_STATUS(s)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
            }}
          />
        </div>

        {(statusFilter !== "all" || startDate || endDate) && (
          <button
            onClick={() => {
              setStatusFilter("all")
              setStartDate("")
              setEndDate("")
            }}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "transparent",
              color: "var(--text-secondary)",
              cursor: "pointer",
              marginBottom: "1px",
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Orders grid */}
      <div className="orders-grid">
        {filteredData.map((o) => {
          const status = o.status || "ordered"

          return (
            <div
              key={o._id}
              className="order-card-new"
              onClick={() => navigate(`/admin/orders/${o._id}`)}
              style={{
                cursor: "pointer",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
            >
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
                    {PRETTY_STATUS(status)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "11px",
                    color: "var(--text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    fontWeight: 700,
                  }}
                >
                  Status managed by vendor
                </div>

                <div
                  style={{
                    marginTop: "6px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  Click to view full tracking →
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
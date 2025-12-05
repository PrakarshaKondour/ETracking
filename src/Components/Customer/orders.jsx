"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"
import { ORDER_STATUS_FLOW, PRETTY_STATUS } from "../../constants/orderStatus";

const CustomerOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await apiCall("/api/customer/orders")
        if (!mounted) return
        setOrders(res.orders || [])
      } catch (e) {
        console.error("Orders fetch error:", e)
        if (mounted) setOrders([])
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading orders…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>My Orders</h2>
      <p className="page-subtitle">Track and manage your purchases</p>

      <div className="panel" style={{ marginBottom: "24px", display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "end" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)",
              minWidth: "150px"
            }}
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUS_FLOW.map(s => (
              <option key={s} value={s}>{PRETTY_STATUS(s)}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "13px", fontWeight: "500", color: "var(--text-secondary)" }}>End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-secondary)",
              color: "var(--text-primary)"
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
              marginBottom: "1px"
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {orders
        .filter(o => {
          if (statusFilter !== "all" && o.status !== statusFilter) return false
          if (startDate && new Date(o.createdAt) < new Date(startDate)) return false
          if (endDate) {
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)
            if (new Date(o.createdAt) > end) return false
          }
          return true
        })
        .length ? (
        <div className="orders-grid">
          {orders
            .filter(o => {
              if (statusFilter !== "all" && o.status !== statusFilter) return false
              if (startDate && new Date(o.createdAt) < new Date(startDate)) return false
              if (endDate) {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                if (new Date(o.createdAt) > end) return false
              }
              return true
            })
            .map((o) => (
              <div key={o._id} className="order-card-new">
                <div className="order-card-header-new">
                  <div className="order-id">#{o._id?.slice(-8).toUpperCase() || "N/A"}</div>
                  <div className="order-amount">${(o.total || 0).toFixed(2)}</div>
                </div>

                <div className="order-details">
                  <div className="order-detail-row">
                    <span className="order-detail-label">Items</span>
                    <span className="order-detail-value">{o.items?.length || 0}</span>
                  </div>
                  <div className="order-detail-row">
                    <span className="order-detail-label">Date</span>
                    <span className="order-detail-value">
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
                    </span>
                  </div>
                </div>

                <div className="order-status-section">
                  <div className="order-status-display">
                    <span className="order-status-label">Status</span>
                    <span className={`order-status-badge-new ${o.status || "pending"}`}>
                      {(o.status || "pending").charAt(0).toUpperCase() + (o.status || "pending").slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "60px 40px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "18px", fontWeight: "600" }}>No orders yet</div>
          <div style={{ fontSize: "13px", marginTop: "8px" }}>Start exploring products to place your first order</div>
        </div>
      )}
    </div>
  )
}

export default CustomerOrders

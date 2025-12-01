"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const CustomerOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

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
      {orders.length ? (
        <div className="orders-grid">
          {orders.map((o) => (
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

"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { ORDER_STATUS_FLOW, PRETTY_STATUS } from "../../constants/orderStatus";

const statusFlow = ORDER_STATUS_FLOW;

const VendorOrders = () => {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000"

  // Load vendor orders
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const res = await fetch(`${API}/api/vendor/orders`, { headers })
        const json = await res.json().catch(() => ({}))

        if (!mounted) return

        if (!res.ok) {
          console.error("Orders fetch error:", json)
          setOrders([])
        } else {
          setOrders(json.orders || [])
        }
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
  }, [API])

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")
      const headers = token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" }

      const res = await fetch(`${API}/api/vendor/orders/${orderId}/status`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: newStatus }),
      })

      const json = await res.json().catch(() => ({}))

      if (!res.ok) {
        alert(json.message || "Failed to update order status")
        return
      }

      // Update local state
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o)))
    } catch (err) {
      console.error("Status update error:", err)
      alert("Network error: " + err.message)
    }
  }

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading orders…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Orders</h2>
      <p className="page-subtitle">Manage your vendor orders • {orders.length} total orders</p>
      {orders.length ? (
        <div className="orders-grid">
          {orders.map((o) => {
            const current = o.status || "ordered"
            let currentIndex = statusFlow.indexOf(current)
            if (currentIndex === -1) currentIndex = 0

            const canGoBack = currentIndex > 0
            const canGoForward = currentIndex < statusFlow.length - 1
            const prevStatus = canGoBack ? statusFlow[currentIndex - 1] : null
            const nextStatus = canGoForward ? statusFlow[currentIndex + 1] : null

            return (
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
                      {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                </div>

                <div className="order-status-section">
                  <div className="order-status-display">
                    <span className="order-status-label">Status</span>
                    <span className={`order-status-badge-new ${current}`}>
                      {PRETTY_STATUS(current)}
                    </span>
                  </div>

                  <div className="status-buttons">
                    {canGoBack && prevStatus &&(
                      <button
                        className="status-btn"
                        onClick={() => handleStatusChange(o._id, prevStatus)}
                        title={`Move to ${PRETTY_STATUS(prevStatus)}`}
                      >
                        <span className="status-btn-icon">←</span>
                        {PRETTY_STATUS(prevStatus)}
                      </button>
                    )}
                    {canGoForward && nextStatus &&(
                      <button
                        className="status-btn"
                        onClick={() => handleStatusChange(o._id, nextStatus)}
                        title={`Move to ${PRETTY_STATUS(nextStatus)}`}
                      >
                        {PRETTY_STATUS(nextStatus)}
                        <span className="status-btn-icon">→</span>
                      </button>
                    )}
                    {!canGoBack && !canGoForward && (
                      <span
                        style={{
                          fontSize: "11px",
                          color: "var(--text-tertiary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          fontWeight: "700",
                        }}
                      >
                        Final Status
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="panel" style={{ textAlign: "center", padding: "60px 40px", color: "var(--text-secondary)" }}>
          <div style={{ fontSize: "18px", fontWeight: "600" }}>No orders yet</div>
          <div style={{ fontSize: "13px", marginTop: "8px" }}>Your vendor orders will appear here</div>
        </div>
      )}
    </div>
  )
}

export default VendorOrders

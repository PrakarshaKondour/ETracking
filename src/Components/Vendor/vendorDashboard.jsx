"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const VendorDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [delayedOrders, setDelayedOrders] = useState([])

  const username = (() => {
    try {
      const u = localStorage.getItem("user") || sessionStorage.getItem("user")
      return u ? JSON.parse(u).username : "Seller"
    } catch {
      return "Seller"
    }
  })()

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const [dashResp, delayedResp] = await Promise.allSettled([
          apiCall("/api/vendor/dashboard"),
          apiCall("/api/vendor/delayed-orders")
        ])

        if (!mounted) return

        if (dashResp.status === "fulfilled") {
          setData(dashResp.value.data || {})
        } else {
          console.error("Dashboard fetch error:", dashResp.reason)
          setData({})
        }

        if (delayedResp.status === "fulfilled") {
          setDelayedOrders(delayedResp.value?.delayedOrders || [])
        } else {
          console.warn("Delayed orders fetch failed:", delayedResp.reason)
          setDelayedOrders([])
        }
      } catch (e) {
        console.error("Dashboard error:", e)
        if (mounted) {
          setData({})
          setDelayedOrders([])
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [username])

  const navigate = useNavigate()

  const acknowledge = async (orderId) => {
    try {
      await apiCall(`/api/vendor/notifications/ack/${orderId}`, { method: 'POST' })
      setDelayedOrders(prev => prev.filter(o => o._id !== orderId))
    } catch (e) {
      console.error('Ack error:', e)
      alert('Failed to acknowledge notification')
    }
  }

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Welcome back, {username}!</h2>
      <p className="page-subtitle">Your store performance and recent activity at a glance</p>

      {/* Delayed orders reminder */}
      {delayedOrders.length > 0 && (
        <div className="panel" style={{ background: 'linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%)', border: '1px solid #ffcccc', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 24 }}>⏱️</span>
              <div>
                <h4 style={{ margin: 0, color: '#d32f2f' }}>
                  {delayedOrders.length} {delayedOrders.length === 1 ? 'Order' : 'Orders'} Delayed
                </h4>
                <p style={{ margin: 0, fontSize: 12, color: '#c62828', marginTop: 4 }}>
                  These orders haven't been updated in over 24 hours. Please review and update their status.
                </p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {delayedOrders.map((o) => (
              <div key={o._id} className="order-card" style={{ background: '#fff8f8', borderLeft: '4px solid #f87171', marginBottom: 8 }}>
                <div className="order-card-header" onClick={() => navigate(`/vendor/orders/${o._id}`)} style={{ cursor: 'pointer' }}>
                  <span className="order-card-id">Order #{o._id?.slice(-8) || o._id}</span>
                  <span className="order-card-amount">${(o.total || 0).toFixed(2)}</span>
                </div>
                <div className="order-card-meta">
                  <span>Customer: {o.customerUsername || '—'}</span>
                  <span>Status: {o.status ? o.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Processing'}</span>
                  {o.createdAt && <span>{new Date(o.createdAt).toLocaleString()}</span>}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => acknowledge(o._id)} style={{ padding: '6px 10px', fontSize: 12 }}>Acknowledge</button>
                  <button onClick={() => navigate(`/vendor/orders/${o._id}`)} style={{ padding: '6px 10px', fontSize: 12 }}>View</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid">
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div>{data?.totalOrders ?? 0}</div>
          <div className="stat-description">Orders received from customers</div>
        </div>
        <div className="panel stat">
          <h4>Total Revenue</h4>
          <div>${(data?.totalRevenue || 0).toFixed(2)}</div>
          <div className="stat-description">Your earnings from all sales</div>
        </div>
        <div className="panel stat">
          <h4>Pending Orders</h4>
          <div>{data?.pendingOrders ?? 0}</div>
          <div className="stat-description">Orders awaiting fulfillment</div>
        </div>
      </div>

      {data?.recentOrders?.length > 0 && (
        <div className="panel">
          <h4>Recent Orders</h4>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Your latest incoming orders and activity
          </p>
          <div className="recent-orders-list">
            {data.recentOrders.map((o) => (
              <div key={o._id} className="order-card">
                <div className="order-card-header">
                  <span className="order-card-id">Order #{o._id?.slice(-8) || "N/A"}</span>
                  <span className="order-card-amount">${(o.total || 0).toFixed(2)}</span>
                </div>
                <div className="order-card-meta">
                  <span>Status: {o.status ? o.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Pending'}</span>
                  {o.createdAt && <span>{new Date(o.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
            {data.totalOrders > data.recentOrders.length && (
              <div style={{ marginTop: 12, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
                Showing {data.recentOrders.length} of {data.totalOrders} orders
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorDashboard
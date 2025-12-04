"use client"

import { useEffect, useState } from "react"
import { useNavigate } from 'react-router-dom'
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const CustomerDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [delayedOrders, setDelayedOrders] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await apiCall("/api/customer/dashboard")
        if (!mounted) return
        setData(res.data || {})

        // Fetch delayed orders
        const delayedRes = await apiCall("/api/customer/delayed-orders")
        if (!mounted) return
        setDelayedOrders(delayedRes.delayedOrders || [])
      } catch (e) {
        console.error("Dashboard fetch error:", e)
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
  }, [])

  const navigate = useNavigate()

  const acknowledge = async (orderId) => {
    try {
      await apiCall(`/api/customer/notifications/ack/${orderId}`, { method: 'POST' })
      setDelayedOrders(prev => prev.filter(o => o._id !== orderId))
    } catch (e) {
      console.error('Ack error:', e)
      alert('Failed to acknowledge notification')
    }
  }

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading dashboard…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Your Orders</h2>
      <p className="page-subtitle">Track your purchases and spending history</p>

      {/* Delayed orders alert + details */}
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
                  Your order(s) haven't been updated by the vendor in over 24 hours.
                </p>
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>We notified the vendor — contact support if needed.</div>
          </div>

          <div style={{ marginTop: 12 }}>
            {delayedOrders.map((o) => (
              <div key={o._id} className="order-card" style={{ background: '#fff8f8', borderLeft: '4px solid #f87171', marginBottom: 8 }}>
                <div className="order-card-header" onClick={() => navigate(`/customer/orders/${o._id}`)} style={{ cursor: 'pointer' }}>
                  <span className="order-card-id">Order #{o._id?.slice(-8) || o._id}</span>
                  <span className="order-card-amount">${(o.total || 0).toFixed(2)}</span>
                </div>
                <div className="order-card-meta">
                  <span>Vendor: {o.vendorUsername || '—'}</span>
                  <span>Status: {o.status ? o.status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Processing'}</span>
                  {o.createdAt && <span>{new Date(o.createdAt).toLocaleString()}</span>}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => acknowledge(o._id)} style={{ padding: '6px 10px', fontSize: 12 }}>Acknowledge</button>
                  <button onClick={() => navigate(`/customer/orders/${o._id}`)} style={{ padding: '6px 10px', fontSize: 12 }}>View</button>
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
          <div className="stat-description">All purchases you've made</div>
        </div>
        <div className="panel stat">
          <h4>Total Amount Spent</h4>
          <div>${(data?.totalSpent || 0).toFixed(2)}</div>
          <div className="stat-description">Cumulative spending</div>
        </div>
        <div className="panel stat">
          <h4>Average Order Value</h4>
          <div>${((data?.totalSpent || 0) / (data?.totalOrders || 1)).toFixed(2)}</div>
          <div className="stat-description">Typical purchase amount</div>
        </div>
      </div>

      {data?.recentOrders?.length > 0 && (
        <div className="panel">
          <h4>Recent Orders</h4>
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>
            Your latest purchases and order status
          </p>
          <div className="recent-orders-list">
            {data.recentOrders.map((o) => (
              <div key={o._id} className="order-card">
                <div className="order-card-header">
                  <span className="order-card-id">Order #{o._id?.slice(-8) || "N/A"}</span>
                  <span className="order-card-amount">${(o.total || 0).toFixed(2)}</span>
                </div>
                <div className="order-card-meta">
                  <span>Status: {o.status === 'delivered' ? 'Completed' : (o.status ? o.status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : 'Processing')}</span>
                  {o.createdAt && <span>{new Date(o.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerDashboard

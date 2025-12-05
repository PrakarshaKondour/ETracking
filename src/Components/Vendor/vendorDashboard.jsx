"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const VendorDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

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
        const res = await apiCall("/api/vendor/dashboard")
        if (!mounted) return
        setData(res.data || {})
      } catch (e) {
        console.error("Dashboard error:", e)
        if (mounted) setData({})
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [username])

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
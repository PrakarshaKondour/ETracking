"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const CustomerDashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const dashResp = await apiCall("/api/customer/dashboard")
        if (!mounted) return
        setData(dashResp.data || {})
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
  }, [])

  const navigate = useNavigate()

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
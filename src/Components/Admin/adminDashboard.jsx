"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"

const AdminDashboard = () => {
  const [stats, setStats] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [clearing, setClearing] = useState(false)
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

    async function loadNotifications() {
      try {
        const data = await apiCall('/api/notifications')
        setNotifications(data?.data?.notifications || [])
      } catch (err) {
        console.error('Failed to load notifications:', err)
      }
    }

    load()
    loadNotifications()

    // Open SSE stream for real-time notifications (fallback to polling retained)
    let es
    try {
      const API = process.env.REACT_APP_API_URL || 'http://localhost:5000'
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken')
      if (token) {
        es = new EventSource(`${API}/api/notifications/stream?token=${token}`)
        es.addEventListener('notification', (e) => {
          try {
            const payload = JSON.parse(e.data)
            if (payload.type === 'order.updated' && payload.data?.removed) {
              // remove any delayed-order notifications for this order
              setNotifications(prev => prev.filter(n => !(n._notifType === 'order_delayed_escalation' && n.data?.orderId === payload.data.orderId)))
            } else if (payload.type === 'order.delayed_escalation') {
              // prepend new escalation
              setNotifications(prev => [ { _notifType: 'order_delayed_escalation', data: payload.data, timestamp: new Date().toISOString() }, ...prev ])
            }
          } catch (e) { console.error('SSE parse error', e) }
        })
        es.onerror = (err) => {
          console.error('SSE error', err)
          // keep polling as fallback
        }
      }
    } catch (e) {
      console.warn('Failed to open SSE stream:', e)
    }

    // Poll for notifications every 10 seconds as a fallback
    const notificationInterval = setInterval(loadNotifications, 10000)
    return () => {
      clearInterval(notificationInterval)
      try { es && es.close() } catch(e){}
    }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2>System Overview</h2>
          <p className="page-subtitle">Real-time insights into platform activity and growth metrics</p>
        </div>
        {notifications.length > 0 && (
          <div>
            <button
              className="btn secondary"
              onClick={async () => {
                try {
                  setClearing(true)
                  await apiCall('/api/notifications', { method: 'DELETE' })
                  setNotifications([])
                } catch (err) {
                  console.error('Failed to clear notifications:', err)
                  window.alert('Failed to clear notifications')
                } finally {
                  setClearing(false)
                }
              }}
              disabled={clearing}
            >
              {clearing ? 'Clearing...' : 'Clear All Notifications'}
            </button>
          </div>
        )}
      </div>
      <p className="page-subtitle">Real-time insights into platform activity and growth metrics</p>

      {/* Pending Vendor Registrations Section */}
      {/* Delayed order escalations */}
      {notifications.filter(n => n._notifType === 'order_delayed_escalation').length > 0 && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #ef4444' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ⏱️ Delayed Orders (Escalated)
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>
              {notifications.filter(n => n._notifType === 'order_delayed_escalation').length}
            </span>
          </h3>
          <div style={{ marginTop: '12px' }}>
            {notifications.filter(n => n._notifType === 'order_delayed_escalation').map((notif, idx) => (
              <div key={idx} style={{ padding: '12px', marginBottom: '8px', backgroundColor: '#fff5f5', borderRadius: '4px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontWeight: '700' }}>Order ID: {notif.data?.orderId}</div>
                <div style={{ fontSize: '14px', color: '#555' }}>Vendor: {notif.data?.vendorUsername}</div>
                <div style={{ fontSize: '14px', color: '#555' }}>Customer: {notif.data?.customerUsername}</div>
                <div style={{ fontSize: '14px', color: '#555' }}>Status: {notif.data?.status}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Created: {new Date(notif.data?.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Vendor Registrations Section */}
      {notifications.filter(n => n._notifType === 'vendor_registration').length > 0 && (
        <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔔 Pending Vendor Approvals
            <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#f59e0b' }}>
              {notifications.filter(n => n._notifType === 'vendor_registration').length}
            </span>
          </h3>
          <div style={{ marginTop: '12px' }}>
            {notifications.filter(n => n._notifType === 'vendor_registration').map((notif, idx) => (
              <div key={idx} style={{ padding: '12px', marginBottom: '8px', backgroundColor: '#fef3c7', borderRadius: '4px', borderLeft: '3px solid #f59e0b' }}>
                <div style={{ fontWeight: 'bold' }}>{notif.data?.companyName || 'New Vendor'}</div>
                <div style={{ fontSize: '14px', color: '#555' }}>Username: {notif.data?.username}</div>
                <div style={{ fontSize: '14px', color: '#555' }}>Email: {notif.data?.email}</div>
                {notif.data?.phone && <div style={{ fontSize: '14px', color: '#555' }}>Phone: {notif.data?.phone}</div>}
                <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>Registered: {new Date(notif.timestamp).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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

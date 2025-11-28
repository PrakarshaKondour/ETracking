"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"

const AdminCustomers = () => {
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
        const res = await fetch(`${API}/api/admin/customers`, { headers })
        const json = await res.json().catch(() => ({}))
        if (!mounted) return
        if (!res.ok) {
          setErr(json.message || "Failed to load")
        } else setData(json.data || [])
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
  }, [])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading customers…</div>
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
        <h2>Customer Directory</h2>
        <p className="page-subtitle">View all registered customers</p>
        <div className="panel">No customers yet.</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Customer Directory</h2>
      <p className="page-subtitle">Browse all registered customers • {data.length} total customers</p>

      <div className="customers-grid">
        {data.map((c) => (
          <div key={c._id} className="customer-card">
            <div className="customer-name">{c.fullName || "No Name"}</div>
            <div className="customer-username">@{c.username}</div>

            <div className="customer-info">
              <div className="info-row">
                <span className="info-row-label">Email</span>
                <span className="info-row-value">{c.email}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Phone</span>
                <span className="info-row-value">{c.phone || "—"}</span>
              </div>
              <div className="info-row">
                <span className="info-row-label">Status</span>
                <span className="info-row-value" style={{ color: "var(--accent)", fontWeight: "700" }}>
                  Active
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminCustomers

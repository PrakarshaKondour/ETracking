"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"

const AdminAnalytics = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const API = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const token = localStorage.getItem("authToken") || sessionStorage.getItem("authToken")

        const res = await fetch(`${API}/api/admin/analytics`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        const json = await res.json()

        if (!mounted) return

        if (res.ok) {
          setData(json.data || {})
        } else {
          console.error("Analytics error:", json)
        }
      } catch (e) {
        console.error("Analytics fetch error", e)
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
        <div className="panel">Loading analytics…</div>
      </div>
    )

  return (
    <div className="page">
      <h2>Platform Analytics</h2>
      <p className="page-subtitle">Comprehensive performance metrics and financial overview</p>

      <div className="grid">
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div>{data?.totalOrders ?? "—"}</div>
          <div className="stat-description">All transactions processed</div>
        </div>
        <div className="panel stat">
          <h4>Total Revenue</h4>
          <div>${(data?.revenue || 0).toFixed(2)}</div>
          <div className="stat-description">Cumulative earnings from all sales</div>
        </div>
        <div className="panel stat">
          <h4>Average Order Value</h4>
          <div>${((data?.revenue || 0) / (data?.totalOrders || 1)).toFixed(2)}</div>
          <div className="stat-description">Mean transaction amount</div>
        </div>
      </div>
    </div>
  )
}

export default AdminAnalytics

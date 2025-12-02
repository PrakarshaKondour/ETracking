"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import LineChart from "../Charts/LineChart"
import BarChart from "../Charts/BarChart"
import PieChart from "../Charts/PieChart"

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
  }, [API])

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading analytics…</div>
      </div>
    )

  // Prepare data for charts
  const statusChartData = data?.statusBreakdown
    ? Object.entries(data.statusBreakdown).map(([name, value]) => ({
      name: name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value
    }))
    : []

  // Show top 5 vendors (highest revenue)
  const topVendorsData = data?.topVendors
    ?.sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending (highest first)
    ?.slice(0, 5)
    ?.map(v => ({
      name: v.vendor,
      revenue: v.revenue,
      orders: v.orderCount
    })) || []

  return (
    <div className="page">
      <h2>Platform Analytics</h2>
      <p className="page-subtitle">Comprehensive performance metrics and financial overview</p>

      {/* Stats Cards */}
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

      {/* Charts */}
      <div
        className="grid"
        style={{
          marginTop: '2rem',
          gridTemplateColumns: "1fr 1fr", // TWO WIDE COLUMNS
          gap: "2rem"
        }}
      >

        {/* Revenue Trend */}
        {data?.timeSeries && data.timeSeries.length > 0 && (
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <h3>Revenue & Orders Trend (Last 30 Days)</h3>
            <LineChart
              data={data.timeSeries}
              dataKeys={['revenue', 'orders']}
              xAxisKey="date"
              height={350}
              colors={['#8884d8', '#82ca9d']}
            />
          </div>
        )}

        {/* Order Status Distribution */}
        {statusChartData.length > 0 && (
          <div className="panel">
            <h3>Order Status Distribution</h3>
            <div style={{ width: '100%', height: '400px' }}>
              <PieChart
                data={statusChartData}
                dataKey="value"
                nameKey="name"
                height={400}
              />
            </div>
          </div>
        )}

        {/* Top 5 Vendors */}
        {topVendorsData.length > 0 && (
          <div className="panel">
            <h3>🏆 Top 5 Vendors by Revenue</h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Highest performing vendors on the platform
            </p>
            <div style={{ width: '100%', height: '350px' }}>
              <BarChart
                data={topVendorsData}
                dataKeys={['revenue']}
                xAxisKey="name"
                height={350}
                colors={['#82ca9d']}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminAnalytics

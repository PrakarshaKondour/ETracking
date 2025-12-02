"use client"

import { useEffect, useState } from "react"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"
import LineChart from "../Charts/LineChart"
import PieChart from "../Charts/PieChart"

const VendorAnalytics = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await apiCall("/api/vendor/analytics")
        if (!mounted) return
        setData(res.data || {})
      } catch (e) {
        console.error("Analytics fetch error:", e)
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

  if (loading)
    return (
      <div className="page">
        <div className="panel">Loading analytics…</div>
      </div>
    )

  // Prepare data for charts
  const statusChartData = data?.statusBreakdown
    ? Object.entries(data.statusBreakdown).map(([name, value]) => ({ name, value }))
    : []

  const performanceTrends = data?.performanceTrends

  return (
    <div className="page">
      <h2>Business Analytics</h2>
      <p className="page-subtitle">Track your performance and growth metrics</p>

      {/* Stats Cards */}
      <div className="grid">
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div>{data?.totalOrders ?? 0}</div>
          <div className="stat-description">All time orders</div>
        </div>
        <div className="panel stat">
          <h4>Total Revenue</h4>
          <div>${(data?.totalRevenue || 0).toFixed(2)}</div>
          <div className="stat-description">Cumulative earnings</div>
        </div>
        <div className="panel stat">
          <h4>Avg Order Value</h4>
          <div>${((data?.totalRevenue || 0) / (data?.totalOrders || 1)).toFixed(2)}</div>
          <div className="stat-description">Mean transaction amount</div>
        </div>
      </div>

      {/* Performance Trends */}
      {performanceTrends && (
        <div className="grid" style={{ marginTop: '2rem' }}>
          <div className="panel stat">
            <h4>Weekly Order Growth</h4>
            <div style={{ color: performanceTrends.orderGrowth >= 0 ? '#00C49F' : '#FF8042' }}>
              {performanceTrends.orderGrowth >= 0 ? '+' : ''}{performanceTrends.orderGrowth}%
            </div>
            <div className="stat-description">
              Last week: {performanceTrends.lastWeek.orders} orders
            </div>
          </div>
          <div className="panel stat">
            <h4>Weekly Revenue Growth</h4>
            <div style={{ color: performanceTrends.revenueGrowth >= 0 ? '#00C49F' : '#FF8042' }}>
              {performanceTrends.revenueGrowth >= 0 ? '+' : ''}{performanceTrends.revenueGrowth}%
            </div>
            <div className="stat-description">
              Last week: ${performanceTrends.lastWeek.revenue.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid" style={{ marginTop: '2rem' }}>
        {/* Revenue Trend */}
        {data?.timeSeries && data.timeSeries.length > 0 && (
          <div className="panel" style={{ gridColumn: '1 / -1' }}>
            <h3>Revenue & Orders Trend (Last 30 Days)</h3>
            <LineChart
              data={data.timeSeries}
              dataKeys={['revenue', 'orders']}
              xAxisKey="date"
              height={300}
              colors={['#8884d8', '#82ca9d']}
            />
          </div>
        )}

        {/* Order Status Distribution */}
        {statusChartData.length > 0 && (
          <div className="panel">
            <h3>Order Status Breakdown</h3>
            <PieChart
              data={statusChartData}
              dataKey="value"
              nameKey="name"
              height={300}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default VendorAnalytics

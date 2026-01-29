"use client"

import React, { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import "../../Components/Layout/Page.css"
import { apiCall } from "../../utils/api"
import OrderTracking from "../common/OrderTracking"

const AdminOrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState("")

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        // ✅ FIX: Use apiCall helper - returns { ok: true, data: order }
        const res = await apiCall(`/api/admin/orders/${id}`)
        
        if (!mounted) return
        
        // Backend returns { ok: true, data: order }
        setOrder(res.data || null)
      } catch (e) {
        console.error("Admin order fetch error:", e)
        if (!mounted) return
        setErr(e.message || "Failed to load order")
        setOrder(null)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <div className="panel panel-loading">
          <div className="loading-spinner"></div>
          <p>Loading order…</p>
        </div>
      </div>
    )
  }

  if (err) {
    return (
      <div className="page">
        <button
          onClick={() => navigate(-1)}
          className="btn-back"
        >
          ← Back
        </button>
        <div className="panel panel-error">{err}</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="page">
        <button
          onClick={() => navigate(-1)}
          className="btn-back"
        >
          ← Back
        </button>
        <div className="panel">Order not found.</div>
      </div>
    )
  }

  return (
    <div className="page">
      <button
        onClick={() => navigate(-1)}
        className="btn-back"
      >
        ← Back
      </button>
      <h2>Order Details</h2>
      <p className="page-subtitle">Admin view • Full tracking and metadata</p>

      {/* Tracking section with enhanced animation */}
      <div className="panel panel-tracking">
        <OrderTracking currentStatus={order.status} history={order.history || []} />
      </div>

      {/* Main info panel */}
      <div className="panel panel-order-info">
        {/* Top row: ID + total */}
        <div className="order-info-header">
          <div className="order-id-section">
            <div className="label">Order ID</div>
            <div className="value">#{order._id?.slice(-12) || order._id}</div>
            {order.reference && (
              <div className="meta">
                Ref: {order.reference}
              </div>
            )}
          </div>
          <div className="order-total-section">
            <div className="label">Total</div>
            <div className="value currency">${(order.total || 0).toFixed(2)}</div>
            {order.currency && (
              <div className="meta">{order.currency.toUpperCase()}</div>
            )}
          </div>
        </div>

        <hr className="divider" />

        {/* Parties */}
        <div className="order-parties">
          <div className="party-card">
            <div className="party-label">Customer</div>
            <div className="party-value">
              {order.customerUsername || "Unknown"}
            </div>
            {order.customerEmail && (
              <div className="party-email">{order.customerEmail}</div>
            )}
          </div>

          <div className="party-card">
            <div className="party-label">Vendor</div>
            <div className="party-value">
              {order.vendorUsername || "Unknown"}
            </div>
          </div>

          <div className="party-card">
            <div className="party-label">Status</div>
            <div className={`status-badge status-${order.status || "ordered"}`}>
              {(order.status || "ordered").charAt(0).toUpperCase() + (order.status || "ordered").slice(1)}
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="items-section">
          <div className="section-label">Items</div>
          <div className="items-list">
            {order.items && order.items.length ? (
              <ul>
                {order.items.map((it, idx) => (
                  <li key={idx} className="item-row">
                    <span className="item-name">{it.name}</span>
                    <span className="item-meta">
                      × {it.quantity || 1} — ${(it.price || 0).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-items">No items listed</div>
            )}
          </div>
        </div>

        {/* Meta info */}
        <div className="meta-section">
          {order.createdAt && (
            <div className="meta-item">Created: {new Date(order.createdAt).toLocaleString()}</div>
          )}
          {order.updatedAt && (
            <div className="meta-item">Last Updated: {new Date(order.updatedAt).toLocaleString()}</div>
          )}
          {order.paymentStatus && (
            <div className="meta-item">Payment: {order.paymentStatus}</div>
          )}
          {order.paymentMethod && (
            <div className="meta-item">Method: {order.paymentMethod}</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminOrderDetail

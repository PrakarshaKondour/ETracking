"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../../utils/api';
import '../../Components/Layout/Page.css';
import OrderTracking from '../common/OrderTracking';

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        // ✅ FIX: apiCall returns { ok: true, order }
        const res = await apiCall(`/api/customer/orders/${id}`);
        if (!mounted) return;
        setOrder(res.order || null);
      } catch (e) {
        console.error('Fetch order error:', e);
        if (!mounted) return;
        setErr(e.message || 'Failed to load order');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false };
  }, [id]);

  const handleCancelOrder = async () => {
    if (!order) return;
    
    setCancelLoading(true);
    try {
      // ✅ NEW: Send cancel request to backend
      await apiCall(`/api/customer/orders/${id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Customer requested cancellation' }),
      });

      setCancelSuccess(true);
      setShowCancelModal(false);

      // Show success animation then reload
      setTimeout(() => {
        setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
      }, 500);

      setTimeout(() => {
        setCancelSuccess(false);
      }, 3000);
    } catch (e) {
      console.error('Cancel order error:', e);
      alert('Failed to cancel order: ' + (e.message || 'Unknown error'));
    } finally {
      setCancelLoading(false);
    }
  };

  const canCancel = order && ['ordered', 'processing', 'packing'].includes(order.status);

  if (loading) {
    return (
      <div className="page">
        <div className="panel panel-loading">
          <div className="loading-spinner"></div>
          <p>Loading order…</p>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="page">
        <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
        <div className="panel panel-error">{err}</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page">
        <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
        <div className="panel">Order not found or access denied.</div>
      </div>
    );
  }

  return (
    <div className="page">
      {/* ✅ NEW: Success Toast */}
      {cancelSuccess && (
        <div className="toast toast-success">
          <div className="toast-icon">✓</div>
          <div className="toast-message">
            <strong>Order cancelled</strong>
            <p>Vendor has been notified</p>
          </div>
        </div>
      )}

      {/* ✅ NEW: Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Order</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to cancel this order?</p>
              <p className="modal-meta">
                Order ID: <strong>#{order._id?.slice(-8)}</strong>
              </p>
              <p className="modal-meta">
                Amount: <strong>${(order.total || 0).toFixed(2)}</strong>
              </p>
            </div>
            <div className="modal-footer">
              <button 
                onClick={() => setShowCancelModal(false)}
                className="btn btn-secondary"
              >
                Keep Order
              </button>
              <button 
                onClick={handleCancelOrder}
                disabled={cancelLoading}
                className="btn btn-danger"
              >
                {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button onClick={() => navigate(-1)} className="btn-back">← Back</button>
      <h2>Order Details</h2>
      <p className="page-subtitle">Track your order and view details</p>

      {/* Tracking Section with Enhanced Animation */}
      <div className="panel panel-tracking">
        <OrderTracking
          currentStatus={order.status}
          history={[]}
        />
      </div>

      <div className="panel panel-order-info">
        <div className="order-info-header">
          <div className="order-id-section">
            <div className="label">Order ID</div>
            <div className="value">#{order._id?.slice(-12) || order._id}</div>
          </div>
          <div className="order-total-section">
            <div className="label">Total</div>
            <div className="value currency">${(order.total || 0).toFixed(2)}</div>
          </div>
        </div>

        <hr className="divider" />

        <div className="party-card">
          <div className="party-label">Vendor</div>
          <div className="party-value">{order.vendorUsername}</div>
        </div>

        <div className="party-card">
          <div className="party-label">Status</div>
          <div className={`status-badge status-${order.status || "ordered"}`}>
            {(order.status || 'ordered').charAt(0).toUpperCase() + (order.status || 'ordered').slice(1)}
          </div>
        </div>

        <div className="items-section">
          <div className="section-label">Items</div>
          <div className="items-list">
            {order.items && order.items.length ? (
              <ul>
                {order.items.map((it, i) => (
                  <li key={i} className="item-row">
                    <span className="item-name">{it.name}</span>
                    <span className="item-meta">× {it.quantity || 1} — ${(it.price || 0).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="no-items">No items listed</div>
            )}
          </div>
        </div>

        {order.createdAt && (
          <div className="meta-section">
            <div className="meta-item">
              Created: {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
        )}

        {/* ✅ NEW: Cancel Button */}
        {canCancel && order.status !== 'cancelled' && (
          <div className="action-buttons">
            <button
              onClick={() => setShowCancelModal(true)}
              className="btn btn-outline-danger"
              title="Cancel this order and notify the vendor"
            >
              🚫 Cancel Order
            </button>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="cancelled-notice">
            <div className="cancelled-icon">✕</div>
            <div>This order has been cancelled</div>
          </div>
        )}
      </div>
    </div>
  );
}

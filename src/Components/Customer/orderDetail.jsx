import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../../utils/api';
import '../../Components/Layout/Page.css';

export default function CustomerOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall(`/api/customer/orders/${id}`);
        if (!mounted) return;
        setOrder(res.order || null);
      } catch (e) {
        console.error('Fetch order error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false };
  }, [id]);

  if (loading) return <div className="page"><div className="panel">Loading order…</div></div>;
  if (!order) return <div className="page"><div className="panel">Order not found or access denied.</div></div>;

  return (
    <div className="page">
      <button onClick={() => navigate(-1)} style={{ marginBottom: 12 }}>← Back</button>
      <h2>Order Details</h2>
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Order ID</div>
            <div style={{ fontWeight: 700 }}>#{order._id}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Total</div>
            <div style={{ fontWeight: 700 }}>${(order.total || 0).toFixed(2)}</div>
          </div>
        </div>

        <hr style={{ margin: '12px 0' }} />

        <div>
          <div style={{ fontWeight: 700 }}>Vendor</div>
          <div style={{ color: 'var(--text-secondary)' }}>{order.vendorUsername}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Status</div>
          <div style={{ color: 'var(--text-secondary)' }}>{order.status}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 700 }}>Items</div>
          <div>
            {order.items && order.items.length ? (
              <ul>
                {order.items.map((it, i) => (
                  <li key={i}>{it.name} x {it.quantity} — ${(it.price || 0).toFixed(2)}</li>
                ))}
              </ul>
            ) : (
              <div style={{ color: 'var(--text-secondary)' }}>No items listed</div>
            )}
          </div>
        </div>

        {order.createdAt && (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>Created: {new Date(order.createdAt).toLocaleString()}</div>
        )}
      </div>
    </div>
  );
}

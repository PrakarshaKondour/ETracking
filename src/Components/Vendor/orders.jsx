import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall('/api/vendor/orders');
        if (!mounted) return;
        setOrders(res.orders || []);
      } catch (e) {
        console.error("Orders fetch error:", e);
        if (mounted) setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading orders…</div></div>;

  return (
    <div className="page">
      <h2>Vendor Orders</h2>
      <div className="panel">
        {orders.length ? (
          <div>
            <p style={{ marginBottom: 12, fontWeight: 600 }}>Total Orders: {orders.length}</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #ddd' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Order ID</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Items</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Total</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '8px' }}>{o._id?.slice(-8) || 'N/A'}</td>
                    <td style={{ padding: '8px' }}>{o.items?.length || 0} items</td>
                    <td style={{ padding: '8px' }}>${(o.total || 0).toFixed(2)}</td>
                    <td style={{ padding: '8px' }}>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div>No orders found</div>
        )}
      </div>
    </div>
  );
};

export default VendorOrders;

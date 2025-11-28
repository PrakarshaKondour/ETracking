import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const CustomerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall('/api/customer/orders');
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
      <h2>My Orders</h2>
      <div className="panel">
        {orders.length ? (
          <ul>
            {orders.map(o => (
              <li key={o._id}>
                Order #{o._id} – {o.items.length} items – ${o.total}
              </li>
            ))}
          </ul>
        ) : (
          <div>No orders found</div>
        )}
      </div>
    </div>
  );
};

export default CustomerOrders;

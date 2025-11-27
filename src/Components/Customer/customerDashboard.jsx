import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const CustomerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall('/api/customer/dashboard');
        if (!mounted) return;
        setData(res.data || {});
      } catch (e) {
        console.error("Dashboard fetch error:", e);
        if (mounted) setData({});
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading dashboard…</div></div>;

  return (
    <div className="page">
      <h2>Customer Dashboard</h2>
      <div className="grid">
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data?.totalOrders ?? 0}</div>
        </div>
        <div className="panel stat">
          <h4>Total Spent</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>${(data?.totalSpent || 0).toFixed(2)}</div>
        </div>
        <div className="panel stat">
          <h4>Recent Orders</h4>
          <div style={{ fontSize: 14 }}>
            {data?.recentOrders?.length
              ? data.recentOrders.map(o => <div key={o._id}>Order #{o._id} – ${o.total}</div>)
              : 'No recent orders'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;


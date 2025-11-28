import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const VendorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const username = (() => {
    try {
      const u = localStorage.getItem('user') || sessionStorage.getItem('user');
      return u ? JSON.parse(u).username : 'You';
    } catch {
      return 'You';
    }
  })();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall('/api/vendor/dashboard');
        if (!mounted) return;
        setData(res.data || {});
      } catch (e) {
        console.error("Dashboard error:", e);
        if (mounted) setData({});
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [username]);

  if (loading) return <div className="page"><div className="panel">Loading…</div></div>;

  return (
    <div className="page">
      <h2>Hi, {username}!</h2>
      <div className="grid" style={{ marginTop: 12 }}>
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data?.totalOrders ?? 0}</div>
        </div>
        <div className="panel stat">
          <h4>Total Revenue</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>${(data?.totalRevenue || 0).toFixed(2)}</div>
        </div>
        <div className="panel stat">
          <h4>Recent Orders</h4>
          <div style={{ fontSize: 14 }}>
            {data?.recentOrders?.length
              ? (
                <div>
                  {data.recentOrders.map(o => (
                    <div key={o._id} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #eee' }}>
                      <div><strong>Order #{o._id?.slice(-8) || 'N/A'}</strong></div>
                      <div>Total: ${(o.total || 0).toFixed(2)}</div>
                      {o.createdAt && <div style={{ fontSize: 12, color: '#666' }}>{new Date(o.createdAt).toLocaleDateString()}</div>}
                    </div>
                  ))}
                  {data.totalOrders > data.recentOrders.length && (
                    <div style={{ marginTop: 8, fontSize: 12, color: '#666', fontStyle: 'italic' }}>
                      Showing {data.recentOrders.length} of {data.totalOrders} orders. View all orders in the Orders page.
                    </div>
                  )}
                </div>
              )
              : 'No recent orders'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;

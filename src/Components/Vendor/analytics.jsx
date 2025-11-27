import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const VendorAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall('/api/vendor/analytics');
        if (!mounted) return;
        setData(res.data || {});
      } catch (e) {
        console.error("Analytics fetch error:", e);
        if (mounted) setData({});
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading analytics…</div></div>;

  return (
    <div className="page">
      <h2>Vendor Analytics</h2>
      <div className="grid">
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{data?.totalOrders ?? 0}</div>
        </div>
        <div className="panel stat">
          <h4>Total Revenue</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>${(data?.totalRevenue || 0).toFixed(2)}</div>
        </div>
        <div className="panel stat">
          <h4>Average Order Value</h4>
          <div style={{ fontSize: 22, fontWeight: 700 }}>${(data?.averageOrderValue || 0).toFixed(2)}</div>
        </div>
      </div>
    </div>
  );
};

export default VendorAnalytics;

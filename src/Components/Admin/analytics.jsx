import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const AdminAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await fetch(`${API}/api/admin/analytics`, { headers: { 'x-user-role': role }});
        const json = await res.json();
        if (!mounted) return;
        if (res.ok) setData(json.data || {});
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading analytics…</div></div>;

  return (
    <div className="page">
      <h2>Analytics</h2>
      <div className="grid">
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div style={{fontSize:22,fontWeight:700}}>{data?.totalOrders ?? '—'}</div>
        </div>
        <div className="panel stat">
          <h4>Revenue</h4>
          <div style={{fontSize:22,fontWeight:700}}>${(data?.revenue || 0).toFixed(2)}</div>
        </div>
        <div className="panel stat">
          <h4>Other</h4>
          <div style={{fontSize:16}}>—</div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
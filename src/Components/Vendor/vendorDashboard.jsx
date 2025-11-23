import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const VendorDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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
    async function load(){
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await fetch(`${API}/api/vendor/dashboard`, { headers: { 'x-user-role': role, 'x-user': username }});
        const json = await res.json();
        if (!mounted) return;
        if (res.ok) setData(json.data || {});
        else setData({});
      } catch (e) { console.error(e); if (mounted) setData({}); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [API, username]);

  if (loading) return <div className="page"><div className="panel">Loading…</div></div>;

  const totalOrders = data?.totalOrders ?? 0;
  const vendorName = data?.vendor ?? username;

  return (
    <div className="page">
      <h2>Hi, {vendorName}</h2>
      <div className="grid" style={{marginTop:12}}>
        <div className="panel stat">
          <h4>Total Orders</h4>
          <div style={{fontSize:22,fontWeight:700}}>{totalOrders}</div>
        </div>
        <div className="panel stat">
          <h4>Quick Note</h4>
          <div style={{fontSize:14}}>View full order list for details</div>
        </div>
        <div className="panel stat">
          <h4>Profile</h4>
          <div style={{fontSize:14}}>{vendorName}</div>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboard;
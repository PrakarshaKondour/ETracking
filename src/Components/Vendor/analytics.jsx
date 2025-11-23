import React, { useEffect, useState } from 'react';
import './../../Components/Layout/Page.css';

const VendorAnalytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // username fallback
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
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await fetch(`${API}/api/vendor/analytics`, {
          headers: {
            'x-user-role': role,
            'x-user': username
          }
        });
        const json = await res.json();
        if (!mounted) return;
        if (res.ok) setData(json.data || {});
        else setData({});
      } catch (err) {
        console.error(err);
        if (mounted) setData({});
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [API, username]);

  if (loading) return <div className="page"><div className="panel">Loading analytics…</div></div>;

  // safe fallbacks: never show 'unknown'
  const sales = data?.sales ?? 0;
  const orders = data?.orders ?? 0;

  return (
    <div className="page">
      <h2>Hi, {username}</h2>

      <div className="grid" style={{marginTop:12}}>
        <div className="panel stat">
          <h4>Total Sales</h4>
          <div style={{fontSize:22,fontWeight:700}}>${Number(sales).toFixed(2)}</div>
        </div>

        <div className="panel stat">
          <h4>Orders</h4>
          <div style={{fontSize:22,fontWeight:700}}>{orders}</div>
        </div>

        <div className="panel stat">
          <h4>Overview</h4>
          <div style={{fontSize:14}}>Quick stats for {username}</div>
        </div>
      </div>

      <div className="panel" style={{marginTop:12}}>
        <h4>Details</h4>
        <table>
          <tbody>
            <tr><td><strong>Vendor</strong></td><td>{username}</td></tr>
            <tr><td><strong>Orders</strong></td><td>{orders}</td></tr>
            <tr><td><strong>Sales</strong></td><td>${Number(sales).toFixed(2)}</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VendorAnalytics;
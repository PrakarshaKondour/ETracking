import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const CustomerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const username = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).username : '';
        const res = await fetch(`${API}/api/customer/dashboard`, { headers: { 'x-user-role': role, 'x-user': username }});
        const json = await res.json();
        if (!mounted) return;
        if (res.ok) setData(json.data || {});
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading…</div></div>;

  return (
    <div className="page">
      <h2>Customer Dashboard</h2>
      <div className="panel">
        <h4>Recent Orders</h4>
        { (data?.recentOrders || []).length === 0
          ? <div>No recent orders.</div>
          : <table>
              <thead><tr><th>ID</th><th>Vendor</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {(data.recentOrders || []).map(o => (
                  <tr key={o._id}>
                    <td>{o._id.slice(-8)}</td>
                    <td>{o.vendorUsername}</td>
                    <td>${(o.total || 0).toFixed(2)}</td>
                    <td>{o.status}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </div>
    </div>
  );
};

export default CustomerDashboard;
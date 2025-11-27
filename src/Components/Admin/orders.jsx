import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const AdminOrders = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API}/api/admin/orders`, { headers });
        const json = await res.json().catch(() => ({}));
        if (!mounted) return;
        if (!res.ok) setErr(json.message || 'Failed to load orders');
        else setData(json.data || []);
      } catch (e) {
        if (!mounted) return;
        setErr('Network error');
        console.error(e);
      } finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading orders…</div></div>;
  if (err) return <div className="page"><div className="panel" style={{color:'crimson'}}>{err}</div></div>;
  if (!data.length) return <div className="page"><div className="panel">No orders found.</div></div>;

  return (
    <div className="page">
      <h2>Orders</h2>
      <div className="panel">
        <table>
          <thead>
            <tr><th>Order ID</th><th>Customer</th><th>Vendor</th><th>Total</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            {data.map(o => (
              <tr key={o._id}>
                <td>{o._id.slice(-8)}</td>
                <td>{o.customerUsername}</td>
                <td>{o.vendorUsername}</td>
                <td>${(o.total || 0).toFixed(2)}</td>
                <td>{o.status}</td>
                <td>{new Date(o.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminOrders;

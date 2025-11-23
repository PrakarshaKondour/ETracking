import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const AdminCustomers = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await fetch(`${API}/api/admin/customers`, { headers: { 'x-user-role': role }});
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) { setErr(json.message || 'Failed to load'); }
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

  if (loading) return <div className="page"><div className="panel">Loading customers…</div></div>;
  if (err) return <div className="page"><div className="panel" style={{color:'crimson'}}>{err}</div></div>;
  if (!data.length) return <div className="page"><div className="panel">No customers yet.</div></div>;

  return (
    <div className="page">
      <h2>Customers</h2>
      <div className="panel">
        <table>
          <thead>
            <tr><th>Username</th><th>Full name</th><th>Email</th><th>Phone</th></tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c._id}>
                <td>{c.username}</td>
                <td>{c.fullName || '—'}</td>
                <td>{c.email}</td>
                <td>{c.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCustomers;
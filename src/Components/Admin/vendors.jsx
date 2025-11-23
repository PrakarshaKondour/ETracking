import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const AdminVendors = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await fetch(`${API}/api/admin/vendors`, { headers: { 'x-user-role': role }});
        const json = await res.json();
        if (!mounted) return;
        if (!res.ok) setErr(json.message || 'Failed to load vendors');
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

  if (loading) return <div className="page"><div className="panel">Loading vendors…</div></div>;
  if (err) return <div className="page"><div className="panel" style={{color:'crimson'}}>{err}</div></div>;
  if (!data.length) return <div className="page"><div className="panel">No vendors yet.</div></div>;

  return (
    <div className="page">
      <h2>Vendors</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Username</th><th>Company</th><th>Email</th><th>Phone</th></tr></thead>
          <tbody>
            {data.map(v => (
              <tr key={v._id}>
                <td>{v.username}</td>
                <td>{v.companyName || '—'}</td>
                <td>{v.email}</td>
                <td>{v.phone || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminVendors;
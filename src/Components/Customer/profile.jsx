import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const CustomerProfile = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    let mounted = true;
    async function load(){
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const username = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).username : '';
        const res = await fetch(`${API}/api/customer/profile`, { headers: { 'x-user-role': role, 'x-user': username }});
        const json = await res.json();
        if (!mounted) return;
        if (res.ok) setData(json.data || {});
      } catch (e) { console.error(e); }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading profile…</div></div>;
  if (!data) return <div className="page"><div className="panel">Profile not found.</div></div>;

  return (
    <div className="page">
      <h2>Your Profile</h2>
      <div className="panel">
        <p><strong>Username:</strong> {data.username}</p>
        <p><strong>Full name:</strong> {data.fullName || '—'}</p>
        <p><strong>Email:</strong> {data.email}</p>
        <p><strong>Phone:</strong> {data.phone || '—'}</p>
        <p><strong>Address:</strong> {data.address || '—'}</p>
      </div>
    </div>
  );
};

export default CustomerProfile;
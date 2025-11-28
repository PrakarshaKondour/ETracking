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
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch(`${API}/api/admin/vendors`, { headers });
        const json = await res.json().catch(() => ({}));
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

  const handleApprove = async (username) => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      console.log('Approving vendor:', username);
      const res = await fetch(`${API}/api/admin/vendors/${username}/approve`, { method: 'PATCH', headers });
      const json = await res.json().catch(() => ({}));
      console.log('Approve response:', res.status, json);
      if (!res.ok) {
        alert(json.message || `Failed to approve (${res.status})`);
        return;
      }
      const updatedVendor = json.data || { status: 'approved' };
      setData(prev => prev.map(p => p.username === username ? { ...p, ...updatedVendor } : p));
      alert('Vendor approved successfully!');
    } catch (err) {
      console.error('Approve error:', err);
      alert('Network error: ' + err.message);
    }
  };

  const handleDecline = async (username) => {
    if (!window.confirm('Are you sure you want to decline this vendor?')) return;
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API}/api/admin/vendors/${username}/decline`, { method: 'PATCH', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.message || 'Failed to decline');
        return;
      }
      const updatedVendor = json.data || { status: 'declined' };
      setData(prev => prev.map(p => p.username === username ? { ...p, ...updatedVendor } : p));
      alert('Vendor declined!');
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleHold = async (username) => {
    if (!window.confirm('Put this vendor on hold?')) return;
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API}/api/admin/vendors/${username}/hold`, { method: 'PATCH', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.message || 'Failed to put vendor on hold');
        return;
      }
      const updatedVendor = json.data || { status: 'held' };
      setData(prev => prev.map(p => p.username === username ? { ...p, ...updatedVendor } : p));
      alert('Vendor put on hold!');
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const handleReactivate = async (username) => {
    if (!window.confirm('Reactivate this vendor?')) return;
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API}/api/admin/vendors/${username}/reactivate`, { method: 'PATCH', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(json.message || 'Failed to reactivate');
        return;
      }
      const updatedVendor = json.data || { status: 'approved' };
      setData(prev => prev.map(p => p.username === username ? { ...p, ...updatedVendor } : p));
      alert('Vendor reactivated!');
    } catch (err) {
      console.error(err);
      alert('Network error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'green';
      case 'pending': return 'orange';
      case 'held': return 'purple';
      case 'declined': return 'red';
      default: return 'gray';
    }
  };

  if (loading) return <div className="page"><div className="panel">Loading vendors…</div></div>;
  if (err) return <div className="page"><div className="panel" style={{color:'crimson'}}>{err}</div></div>;
  if (!data.length) return <div className="page"><div className="panel">No vendors yet.</div></div>;

  return (
    <div className="page">
      <h2>Vendors</h2>
      <div className="panel">
        <table>
          <thead><tr><th>Username</th><th>Company</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map(v => (
              <tr key={v._id}>
                <td>{v.username}</td>
                <td>{v.companyName || '—'}</td>
                <td>{v.email}</td>
                <td>{v.phone || '—'}</td>
                <td style={{ color: getStatusColor(v.status || 'pending') }}>
                  {(v.status || 'pending').charAt(0).toUpperCase() + (v.status || 'pending').slice(1)}
                </td>
                <td>
                  {(v.status || 'pending') === 'pending' && (
                    <>
                      <button style={{ marginRight: 6, backgroundColor: '#4CAF50' }} onClick={() => handleApprove(v.username)}>Approve</button>
                      <button style={{ backgroundColor: '#f44336' }} onClick={() => handleDecline(v.username)}>Decline</button>
                    </>
                  )}
                  {(v.status || 'pending') === 'approved' && (
                    <button style={{ backgroundColor: '#FF9800' }} onClick={() => handleHold(v.username)}>Put on Hold</button>
                  )}
                  {(v.status || 'pending') === 'held' && (
                    <button style={{ backgroundColor: '#2196F3' }} onClick={() => handleReactivate(v.username)}>Reactivate</button>
                  )}
                  {(v.status || 'pending') === 'declined' && (
                    <span style={{ color: '#999' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminVendors;

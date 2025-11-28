import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await apiCall('/api/admin/dashboard');
        setStats(data?.data?.stats || null);
      } catch (err) { 
        console.error(err);
        setError(err.message || 'Failed to load dashboard');
      }
      finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading…</div></div>;
  if (error) return <div className="page"><div className="panel" style={{color:'crimson'}}>{error}</div></div>;

  return (
    <div className="page">
      <h2>Admin Dashboard</h2>
      <div className="grid">
        <div className="panel stat">
          <h4>Admins</h4>
          <div style={{fontSize:22,fontWeight:700}}>{stats?.admins ?? '—'}</div>
        </div>
        <div className="panel stat">
          <h4>Vendors</h4>
          <div style={{fontSize:22,fontWeight:700}}>{stats?.vendors ?? '—'}</div>
        </div>
        <div className="panel stat">
          <h4>Customers</h4>
          <div style={{fontSize:22,fontWeight:700}}>{stats?.customers ?? '—'}</div>
        </div>
      </div>

      <div className="panel">
        <h4>Summary</h4>
        <p>Total Orders: <strong>{stats?.orders ?? '—'}</strong></p>
      </div>
    </div>
  );
};

export default AdminDashboard;
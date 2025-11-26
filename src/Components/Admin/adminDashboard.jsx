import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
// ✅ NEW WAY (should be)
import { apiCall } from '../../utils/api';


// Token is automatically included!
const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    async function load() {
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await apiCall('/api/admin/dashboard');
        const d = await res.json();
        setStats(d?.data?.stats || null);
      } catch (err) { console.error(err); }
    }
    load();
  }, []);

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
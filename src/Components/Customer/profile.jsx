import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';

const CustomerProfile = () => {
  const [customer, setCustomer] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const username = (() => {
    try{
      const u = localStorage.getItem('user') || sessionStorage.getItem('user');
      return u ? JSON.parse(u).username : '';
    } catch {
      return '';
    }
  })();

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole');
        const res = await fetch(`${API}/api/customer/profile`, { headers: { 'x-user-role': role, 'x-user': username }});
        const json = await res.json();
        if (!mounted) return;
        if(!res.ok) {
          setErr(json.message || 'Failed to load profile');
        }
        else{
          setCustomer(json.data || null);
        }
      } catch (e) { 
        if(!mounted) return;
        console.error(e);
        setErr('Network error');
      }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, [API, username]);

  if (loading) return <div className="page"><div className="panel">Loading profile…</div></div>;
  if (err) return <div className="page"><div className="panel" style={{color:'crimson'}}>{err}</div></div>;
  if (!customer) return <div className="page"><div className="panel">Profile not found.</div></div>;

  const fmt = (d) => d ? new Date(d).toLocaleString() : '—';

  return (
    <div className="page">
      <h2>Your Profile</h2>
    
    <div className="panel" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, alignItems:'start'}}>
        <div>
          <p><strong>Username</strong></p>
          <div style={{padding:8, background:'#fbfbff', borderRadius:6}}>{customer.username || username || '—'}</div>
          
          <p style={{marginTop:12}}><strong>Email</strong></p>
          <div style={{padding:8, background:'#fbfbff', borderRadius:6}}>{customer.email || '—'}</div>
        </div>
        <div>
          <p><strong>Phone</strong></p>
          <div style={{padding:8, background:'#fbfbff', borderRadius:6}}>{customer.phone || '—'}</div>

          <p style={{marginTop:12}}><strong>Registered</strong></p>
          <div style={{padding:8, background:'#fbfbff', borderRadius:6}}>{fmt(customer.createdAt)}</div>

          <p style={{marginTop:12}}><strong>Additional info</strong></p>
          <div style={{padding:8, background:'#fbfbff', borderRadius:6, color:'#374151'}}>
            {customer.additionalInfo || 'No additional info provided.'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerProfile;
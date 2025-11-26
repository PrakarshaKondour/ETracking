import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const CustomerProfile = () => {
  const [customer, setCustomer] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const json = await apiCall('/api/customer/profile');
        if (!mounted) return;
        setCustomer(json.data || null);
      } catch (e) { 
        if (!mounted) return;
        console.error(e);
        setErr(e.message || 'Failed to load profile');
      }
      finally { if (mounted) setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

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
          <div style={{padding:8, background:'#fbfbff', borderRadius:6}}>{customer.username || '—'}</div>
          
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
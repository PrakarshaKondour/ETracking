import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';
import { getUserRole } from '../../utils/auth';
import { useNavigate } from 'react-router-dom';

const VendorProfile = () => {
  const [vendor, setVendor] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const role = getUserRole();
        if (role !== 'vendor') {
          setError('Vendor access required');
          return;
        }

        const res = await apiCall('/api/vendor/profile'); // expects { ok, vendor }
        if (!mounted) return;
        if (res?.ok) {
          setVendor(res.vendor);
        } else {
          setError(res?.message || 'Failed to fetch profile');
        }
      } catch (e) {
        // If apiCall threw due to 401, auth is cleared -> redirect to login
        if (e.status === 401) {
          setError('Session expired. Please log in again.');
          navigate('/login', { replace: true });
          return;
        }
        setError(e.message || 'Network error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [navigate]);

  if (loading) return <div className="page"><div className="panel">Loading profile…</div></div>;

  return (
    <div className="page">
      <h2>Vendor Profile</h2>
      <div className="panel">
        {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}
        {vendor ? (
          <div>
            <p><strong>Username:</strong> {vendor.username || 'N/A'}</p>
            <p><strong>Email:</strong> {vendor.email || 'N/A'}</p>
            {vendor.companyName && <p><strong>Company Name:</strong> {vendor.companyName}</p>}
            {vendor.phone && <p><strong>Phone:</strong> {vendor.phone}</p>}
            {vendor.status && <p><strong>Status:</strong> {vendor.status}</p>}
            {vendor.createdAt && <p><strong>Member Since:</strong> {new Date(vendor.createdAt).toLocaleDateString()}</p>}
            {vendor.lastActivityAt && <p><strong>Last Activity:</strong> {new Date(vendor.lastActivityAt).toLocaleDateString()}</p>}
          </div>
        ) : !error ? (
          <div>No profile found.</div>
        ) : null}
      </div>
    </div>
  );
};

export default VendorProfile;

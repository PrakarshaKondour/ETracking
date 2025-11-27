import React, { useEffect, useState } from 'react';
import '../../Components/Layout/Page.css';
import { apiCall } from '../../utils/api';

const CustomerProfile = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await apiCall('/api/customer/profile');
        if (!mounted) return;
        setProfile(res.data || null);
      } catch (e) {
        console.error("Profile fetch error:", e);
        if (mounted) setProfile(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="page"><div className="panel">Loading profile…</div></div>;

  return (
    <div className="page">
      <h2>My Profile</h2>
      <div className="panel">
        {profile ? (
          <div>
            <p><strong>Username:</strong> {profile.username || 'N/A'}</p>
            <p><strong>Email:</strong> {profile.email || 'N/A'}</p>
            {profile.fullName && <p><strong>Full Name:</strong> {profile.fullName}</p>}
            {profile.address && <p><strong>Address:</strong> {profile.address}</p>}
            {profile.phone && <p><strong>Phone:</strong> {profile.phone}</p>}
            {profile.createdAt && <p><strong>Member Since:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>}
          </div>
        ) : (
          <div>Profile not found</div>
        )}
      </div>
    </div>
  );
};

export default CustomerProfile;

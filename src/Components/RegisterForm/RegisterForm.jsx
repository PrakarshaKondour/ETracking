import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegisterForm.css';

const RegisterForm = () => {
  const navigate = useNavigate();
  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const [role, setRole] = useState('customer');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (role !== 'vendor' && role !== 'customer') {
      setError('Only vendor and customer registration are allowed.');
      return;
    }
    setLoading(true);
    try {
      const payload = { username, email, password, role };
      if (role === 'vendor') payload.companyName = companyName;
      if (role === 'vendor' || role === 'customer') payload.phone = phone;
      if (role === 'customer') { payload.fullName = fullName; payload.address = address; }

      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        window.alert('Registered. Redirecting to login.');
        navigate('/login', { replace: true });
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (err) {
      console.error(err);
      setError('Server error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='wrapper'>
      <form onSubmit={handleSubmit}>
        <h2>Register</h2>

        <div className='input-field'>
          <select value={role} onChange={e => setRole(e.target.value)}>
            <option value="customer">Customer</option>
            <option value="vendor">Vendor</option>
          </select>
        </div>

        <div className='input-field'>
          <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Username" required />
        </div>

        <div className='input-field'>
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email" required />
        </div>

        <div className='input-field'>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" required />
        </div>

        {role === 'vendor' && (
          <div className='input-field'>
            <input value={companyName} onChange={e => setCompanyName(e.target.value)} type="text" placeholder="Company Name" />
          </div>
        )}

        {(role === 'vendor' || role === 'customer') && (
          <div className='input-field'>
            <input value={phone} onChange={e => setPhone(e.target.value)} type="text" placeholder="Phone" />
          </div>
        )}

        {role === 'customer' && (
          <>
            <div className='input-field'>
              <input value={fullName} onChange={e => setFullName(e.target.value)} type="text" placeholder="Full Name" />
            </div>
            <div className='input-field'>
              <input value={address} onChange={e => setAddress(e.target.value)} type="text" placeholder="Address" />
            </div>
          </>
        )}

        {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        <button type="button" className="btn secondary" onClick={() => navigate('/login')} style={{ marginTop: 10 }}>
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
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
  const [otp, setOtp] = useState('');            // 🔹 NEW
  const [otpSent, setOtpSent] = useState(false); // 🔹 NEW
  const [otpSending, setOtpSending] = useState(false); // 🔹 NEW
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 🔐 Send OTP handler
  const handleSendOtp = async () => {
    setError('');

    if (role !== 'vendor' && role !== 'customer') {
      setError('OTP is only required for customer and vendor.');
      return;
    }

    if (!phone) {
      setError('Phone is required to send OTP.');
      return;
    }

    try {
      setOtpSending(true);
      const res = await fetch(`${API}/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setOtpSent(true);
        // For dev: you can log the OTP if backend returns it
        if (data.otp) {
          console.log('Dev OTP:', data.otp);
        }
        window.alert('OTP sent to your phone.');
      } else {
        setError(data.message || 'Failed to send OTP');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to send OTP. Try again.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (role !== 'vendor' && role !== 'customer') {
      setError('Only vendor and customer registration are allowed.');
      return;
    }

    // 🔐 Require OTP for customer/vendor
    if ((role === 'vendor' || role === 'customer') && !otp) {
      setError('Please enter the OTP sent to your phone.');
      return;
    }

    setLoading(true);
    try {
      const payload = { username, email, password, role };

      if (role === 'vendor') payload.companyName = companyName;
      if (role === 'vendor' || role === 'customer') {
        payload.phone = phone;
        payload.otp = otp; // 🔹 include OTP
      }
      if (role === 'customer') {
        payload.fullName = fullName;
        payload.address = address;
      }

      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (role === 'vendor') {
          window.alert('Registered. Your vendor account is pending admin approval. You will be notified once approved.');
        } else {
          window.alert('Registered. Redirecting to login.');
        }
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
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            type="text"
            placeholder="Username"
            required
          />
        </div>

        <div className='input-field'>
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            required
          />
        </div>

        <div className='input-field'>
          <input
            value={password}
            onChange={e => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
            required
          />
        </div>

        {role === 'vendor' && (
          <div className='input-field'>
            <input
              value={companyName}
              onChange={e => setCompanyName(e.target.value)}
              type="text"
              placeholder="Company Name"
            />
          </div>
        )}

        {(role === 'vendor' || role === 'customer') && (
          <>
            <div className='input-field'>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                type="text"
                placeholder="Phone"
              />
            </div>

            {/* 🔐 OTP input + send button */}
            <div className="input-field otp-group">
              <input
                value={otp}
                onChange={e => setOtp(e.target.value)}
                type="text"
                placeholder="OTP"
                className="otp-input"
              />
              <button
                type="button"
                className="btn secondary otp-btn"
                onClick={handleSendOtp}
                disabled={otpSending || !phone}
              >
                {otpSending ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP'}
              </button>
            </div>  
          </>
        )}

        {role === 'customer' && (
          <>
            <div className='input-field'>
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                type="text"
                placeholder="Full Name"
              />
            </div>
            <div className='input-field'>
              <input
                value={address}
                onChange={e => setAddress(e.target.value)}
                type="text"
                placeholder="Address"
              />
            </div>
          </>
        )}

        {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
        <button
          type="button"
          className="btn secondary"
          onClick={() => navigate('/login')}
          style={{ marginTop: 10 }}
        >
          Back to Login
        </button>
      </form>
    </div>
  );
};

export default RegisterForm;
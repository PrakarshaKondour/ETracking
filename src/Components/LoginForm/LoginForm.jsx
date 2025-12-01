import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginForm.css';
import { setAuth, clearAuth } from '../../utils/auth';

const LoginForm = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      console.log('🔐 Attempting login for:', username);

      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      console.log('📡 Response status:', res.status);

      const data = await res.json().catch(() => ({}));
      console.log('📦 Response data:', data);

      if (res.ok && data.ok && data.token) {
        // clear old tokens first
        clearAuth();
        // save new auth (token stored into selected storage by setAuth)
        setAuth({ role: data.role, user: data.user, token: data.token }, remember);
        // navigate to role dashboard path
        const target = data.role === 'admin' ? '/admin' : data.role === 'vendor' ? '/vendor' : '/customer';
        navigate(target, { replace: true });
        return;
      }

      if (res.status === 404) setError('User not found');
      else if (res.status === 401) setError('Invalid credentials');
      else setError(data.message || 'Login failed');
    } catch (err) {
      console.error('Login error:', err);
      setError('Server error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='wrapper'>
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        <div className='input-field'>
          <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Username" required disabled={loading}/>
        </div>
        <div className='input-field'>
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" required disabled={loading}/>
        </div>

        <div className='remember-forgot'>
          <label>
            <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} disabled={loading}/> Remember me
          </label>
          <a href="#">Forgot Password?</a>
        </div>

        {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

        <button type="submit" className="btn" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <div className='register-link'>
          <p>Don't have an account? <Link to="/register">Register</Link></p>
        </div>
      </form>
    </div>
  );
};

export default LoginForm;

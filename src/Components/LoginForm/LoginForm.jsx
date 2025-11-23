import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LoginForm.css';
import { setAuth } from '../../utils/auth';

const LoginForm = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');

    const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await fetch(`${API}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok) {
                // persist role + user based on remember checkbox
                setAuth({ role: data.role, user: data.user }, remember);
                navigate(`/${data.role}`, { replace: true });
                return;
            }

            if (res.status === 404) {
                setError('User unavailable. Please register.');
                return;
            }
            if (res.status === 401) {
                setError('Invalid credentials. Please check your password.');
                return;
            }

            setError(data.message || 'Login failed. Please try again.');
        } catch (error) {
            console.error('Error during login:', error);
            setError('Server error. Please try again later.');
        }
    };

    return (
      <div className='wrapper'>
        <form onSubmit={handleSubmit}>
          <h2>Login</h2>
          <div className='input-field'>
            <input value={username} onChange={e => setUsername(e.target.value)} type="text" placeholder="Username" required />
          </div>
          <div className='input-field'>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" required />
          </div>

          <div className='remember-forgot'>
            <label>
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember me
            </label>
            <a href="#">Forgot Password?</a>
          </div>

          {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

          <button type="submit" className="btn">Login</button>
          <div className='register-link'>
            <p>Don't have an account? <Link to="/register">Register</Link></p>
          </div>
        </form>
      </div>
    );
};

export default LoginForm;
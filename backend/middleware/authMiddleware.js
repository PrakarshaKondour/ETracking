import jwt from 'jsonwebtoken';
import { getValue } from '../utils/redisHelper.js';

/**
 * Verify JWT token from Authorization header
 * Sets req.user if token is valid
 */
export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('📨 Auth header received:', authHeader ? authHeader.slice(0, 30) + '...' : 'MISSING');
    
    const token = authHeader?.split(' ')[1]; // Extract "Bearer TOKEN"
    
    if (!token) {
      console.log('❌ No token in authorization header');
      return res.status(401).json({ ok: false, message: 'No token provided' });
    }

    console.log('🔐 Token received:', token.slice(0, 30) + '...');

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log('✅ Token verified - User:', decoded.username, 'Role:', decoded.role, 'ID:', decoded.id);
    
    const storedToken = await getValue(`user:${decoded.id}:token`);
    if (storedToken !== token) {
      console.log('❌ Token mismatch - possible logout or token invalidation');
      return res.status(401).json({ ok: false, message: 'Token has been revoked' });
    }

    req.user = decoded; // Attach user info to request
    next();
  } catch (error) {
    console.error('❌ Token verification failed:', error.message);
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }
};

/**
 * Require a specific role. Must be used after verifyToken.
 * Usage: requireRole('admin') or requireRole('vendor')
 */
export const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('❌ No user attached to request');
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }

    if (req.user.role !== role) {
      console.log(`❌ Role mismatch - Expected: ${role}, Got: ${req.user.role}`);
      return res.status(403).json({ ok: false, message: `Only ${role}s can access this` });
    }

    next();
  };
};

/**
 * Generate JWT token for a user
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id?.toString() || user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    iat: Math.floor(Date.now() / 1000),
  };

  const secret = process.env.JWT_SECRET || 'your-secret-key';
  return jwt.sign(payload, secret, { expiresIn: '24h' });
};

export default { verifyToken, requireRole, generateToken };
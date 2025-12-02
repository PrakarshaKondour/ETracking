import jwt from 'jsonwebtoken';
import { getValue } from '../utils/redisHelper.js';

export const authMiddleware = async (req, res, next) => {
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

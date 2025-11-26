const jwt = require('jsonwebtoken');
// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ ok: false, message: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }
}
// Middleware to check specific role
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: 'Unauthorized' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ ok: false, message: 'Forbidden' });
    }
    next();
  };
}
// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}
module.exports = { verifyToken, requireRole, generateToken };

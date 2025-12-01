import jwt from 'jsonwebtoken';
import Vendor from '../models/vendor.js';

export const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ ok: false, message: 'No token provided' });

    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key");

    req.user = decoded;

    // AUTO-LOGOUT VENDORS IF STATUS CHANGED
    if (decoded.role === 'vendor') {
      const vendor = await Vendor.findOne({ username: decoded.username }).lean();

      if (!vendor) {
        return res.status(403).json({ ok: false, message: 'Vendor not found' });
      }

      if (vendor.status === 'held') {
        console.log(`🚫 AUTO-LOGOUT: Vendor "${vendor.username}" is on hold.`);
        return res.status(403).json({ ok: false, message: 'Account on hold' });
      }

      if (vendor.status === 'declined') {
        console.log(`🚫 AUTO-LOGOUT: Vendor "${vendor.username}" has been declined.`);
        return res.status(403).json({ ok: false, message: 'Account declined' });
      }

      if (vendor.status === 'pending') {
        console.log(`🚫 AUTO-LOGOUT: Vendor "${vendor.username}" is pending approval.`);
        return res.status(403).json({ ok: false, message: 'Account pending approval' });
      }
    }

    next();

  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
  }
};

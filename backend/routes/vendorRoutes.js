const express = require('express');
const router = express.Router();
const Vendor = require('../models/vendor');
const Order = require('../models/Order');

function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.header('x-user-role') || (req.user && req.user.role);
    if (!userRole) return res.status(401).json({ ok: false, message: 'Missing role header' });
    if (userRole !== role) return res.status(403).json({ ok: false, message: 'Forbidden' });
    next();
  };
}

router.get('/dashboard', requireRole('vendor'), async (req, res) => {
  const vendor = req.header('x-user') || null;
  const totalOrders = await Order.countDocuments({ vendorUsername: vendor });
  res.json({ ok: true, data: { vendor: vendor || 'unknown', totalOrders } });
});

router.get('/orders', requireRole('vendor'), async (req, res) => {
  const vendor = req.header('x-user') || null;
  const list = await Order.find(vendor ? { vendorUsername: vendor } : {}).sort({ createdAt: -1 });
  res.json({ ok: true, data: list });
});

router.get('/profile', requireRole('vendor'), async (req, res) => {
  const username = req.header('x-user') || null;
  const v = username ? await Vendor.findOne({ username }).select('-password -__v') : null;
  res.json({ ok: true, data: v });
});

router.get('/analytics', requireRole('vendor'), async (req, res) => {
  const vendor = req.header('x-user') || null;
  const totalSalesAgg = await Order.aggregate([
    { $match: vendor ? { vendorUsername: vendor } : {} },
    { $group: { _id: null, sales: { $sum: '$total' }, orders: { $sum: 1 } } }
  ]);
  const stats = totalSalesAgg[0] || { sales: 0, orders: 0 };
  res.json({ ok: true, data: stats });
});

module.exports = router;
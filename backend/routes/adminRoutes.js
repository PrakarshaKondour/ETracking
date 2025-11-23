const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const Order = require('../models/Order');

function requireRole(role) {
  return (req, res, next) => {
    const userRole = req.header('x-user-role') || (req.user && req.user.role);
    if (!userRole) return res.status(401).json({ ok: false, message: 'Missing role header' });
    if (userRole !== role) return res.status(403).json({ ok: false, message: 'Forbidden' });
    next();
  };
}

router.get('/dashboard', requireRole('admin'), async (req, res) => {
  const stats = {
    admins: await Admin.countDocuments(),
    vendors: await Vendor.countDocuments(),
    customers: await Customer.countDocuments(),
    orders: await Order.countDocuments(),
  };
  res.json({ ok: true, role: 'admin', data: { stats } });
});

router.get('/customers', requireRole('admin'), async (req, res) => {
  const list = await Customer.find().select('-__v -password');
  res.json({ ok: true, data: list });
});

router.get('/vendors', requireRole('admin'), async (req, res) => {
  const list = await Vendor.find().select('-__v -password');
  res.json({ ok: true, data: list });
});

router.get('/orders', requireRole('admin'), async (req, res) => {
  const list = await Order.find().sort({ createdAt: -1 });
  res.json({ ok: true, data: list });
});

router.get('/analytics', requireRole('admin'), async (req, res) => {
  // simple analytics sample
  const totalOrders = await Order.countDocuments();
  const revenueAgg = await Order.aggregate([
    { $group: { _id: null, revenue: { $sum: '$total' } } }
  ]);
  const revenue = (revenueAgg[0] && revenueAgg[0].revenue) || 0;
  res.json({ ok: true, data: { totalOrders, revenue } });
});

module.exports = router;
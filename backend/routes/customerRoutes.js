const express = require('express');
const router = express.Router();
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

router.get('/dashboard', requireRole('customer'), async (req, res) => {
  const username = req.header('x-user') || null;
  const orders = await Order.find(username ? { customerUsername: username } : {}).limit(10);
  res.json({ ok: true, data: { recentOrders: orders } });
});

router.get('/orders', requireRole('customer'), async (req, res) => {
  const username = req.header('x-user') || null;
  const list = await Order.find(username ? { customerUsername: username } : {}).sort({ createdAt: -1 });
  res.json({ ok: true, data: list });
});

router.get('/profile', requireRole('customer'), async (req, res) => {
  const username = req.header('x-user') || null;
  const c = username ? await Customer.findOne({ username }).select('-password -__v') : null;
  res.json({ ok: true, data: c });
});

module.exports = router;
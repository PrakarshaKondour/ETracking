const express = require('express');
const router = express.Router();
const Customer = require('../models/customer');
const Order = require('../models/Order');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/dashboard', verifyToken, requireRole('customer'), async (req, res) => {
  const username = req.user.username;
  const orders = await Order.find({ customerUsername: username }).limit(10);
  res.json({ ok: true, data: { recentOrders: orders } });
});

router.get('/orders', verifyToken, requireRole('customer'), async (req, res) => {
  const username = req.user.username;
  const list = await Order.find({ customerUsername: username }).sort({ createdAt: -1 });
  res.json({ ok: true, data: list });
});

router.get('/profile', verifyToken, requireRole('customer'), async (req, res) => {
  const username = req.user.username;
  const c = username ? await Customer.findOne({ username }).select('-password -__v') : null;
  res.json({ ok: true, data: c });
});

module.exports = router;
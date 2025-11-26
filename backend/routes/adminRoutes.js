const express = require('express');
const router = express.Router();
const Admin = require('../models/admin');
const Vendor = require('../models/vendor');
const Customer = require('../models/customer');
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
  // Normalize vendors without status field (legacy data) to have status
  const normalized = list.map(v => ({
    ...v.toObject ? v.toObject() : v,
    status: v.status || 'pending'
  }));
  res.json({ ok: true, data: normalized });
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

// get pending vendors (awaiting approval)
router.get('/pending-vendors', requireRole('admin'), async (req, res) => {
  try {
    const list = await Vendor.find({ status: 'pending' }).select('-__v -password');
    res.json({ ok: true, data: list });
  } catch (err) {
    console.error('Pending vendors error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// approve a vendor by username
router.patch('/vendors/:username/approve', requireRole('admin'), async (req, res) => {
  try {
    const username = req.params.username;
    const v = await Vendor.findOneAndUpdate({ username }, { $set: { status: 'approved', lastActivityAt: new Date() } }, { new: true }).select('-__v -password');
    if (!v) return res.status(404).json({ ok: false, message: 'Vendor not found' });
    res.json({ ok: true, data: v });
  } catch (err) {
    console.error('Approve vendor error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// decline a vendor by username (set status to declined)
router.patch('/vendors/:username/decline', requireRole('admin'), async (req, res) => {
  try {
    const username = req.params.username;
    const v = await Vendor.findOneAndUpdate({ username }, { $set: { status: 'declined' } }, { new: true }).select('-__v -password');
    if (!v) return res.status(404).json({ ok: false, message: 'Vendor not found' });
    res.json({ ok: true, data: v, message: 'Vendor application declined' });
  } catch (err) {
    console.error('Decline vendor error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// put vendor on hold (for inactivity or other reasons)
router.patch('/vendors/:username/hold', requireRole('admin'), async (req, res) => {
  try {
    const username = req.params.username;
    const v = await Vendor.findOneAndUpdate({ username }, { $set: { status: 'held' } }, { new: true }).select('-__v -password');
    if (!v) return res.status(404).json({ ok: false, message: 'Vendor not found' });
    res.json({ ok: true, data: v, message: 'Vendor account put on hold' });
  } catch (err) {
    console.error('Hold vendor error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// reactivate a held vendor
router.patch('/vendors/:username/reactivate', requireRole('admin'), async (req, res) => {
  try {
    const username = req.params.username;
    const v = await Vendor.findOneAndUpdate({ username }, { $set: { status: 'approved', lastActivityAt: new Date() } }, { new: true }).select('-__v -password');
    if (!v) return res.status(404).json({ ok: false, message: 'Vendor not found' });
    res.json({ ok: true, data: v, message: 'Vendor account reactivated' });
  } catch (err) {
    console.error('Reactivate vendor error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

// internal: migrate legacy vendors without status field
router.post('/migrate-vendors', requireRole('admin'), async (req, res) => {
  try {
    const result = await Vendor.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'pending' } }
    );
    res.json({ ok: true, message: `Migrated ${result.modifiedCount} vendors` });
  } catch (err) {
    console.error('Migration error', err);
    res.status(500).json({ ok: false, message: 'Server error' });
  }
});

module.exports = router;
import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import {
  getAdminNotifications,
  clearNotification,
  clearOrderNotification,
  clearAllNotifications,
  // new:
  getVendorNotifications,
  clearVendorNotifications,
  getCustomerNotifications,
  clearCustomerNotifications
} from '../controllers/notificationController.js';
import { addSseClient, removeSseClient } from '../services/notificationService.js';
import { default as client } from '../config/redis.js';

const router = express.Router();

// --- Admin (existing) ---
router.get('/notifications', verifyToken, requireRole('admin'), getAdminNotifications);

// SSE stream for admin (unchanged)
router.get('/notifications/stream', (req, res, next) => {
  if (!req.headers.authorization && req.query && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
}, verifyToken, requireRole('admin'), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  res.write(':ok\n\n');
  addSseClient(res);
  req.on('close', () => {
    removeSseClient(res);
  });
});

router.delete('/notifications/:vendorId', verifyToken, requireRole('admin'), clearNotification);
router.delete('/notifications/order/:orderId', verifyToken, requireRole('admin'), clearOrderNotification);
router.delete('/notifications', verifyToken, requireRole('admin'), clearAllNotifications);

// --- Vendor endpoints ---
// GET vendor notifications
router.get('/vendor/notifications', verifyToken, requireRole('vendor'), getVendorNotifications);
// DELETE vendor notifications (clear all for that vendor)
router.delete('/vendor/notifications', verifyToken, requireRole('vendor'), clearVendorNotifications);

// --- Customer endpoints ---
router.get('/customer/notifications', verifyToken, requireRole('customer'), getCustomerNotifications);
router.delete('/customer/notifications', verifyToken, requireRole('customer'), clearCustomerNotifications);

export default router;
import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { getAdminNotifications, clearNotification, clearAllNotifications } from '../controllers/notificationController.js';

const router = express.Router();

// Get admin notifications (vendor registrations, etc.)
router.get('/notifications', verifyToken, requireRole('admin'), getAdminNotifications);

// Clear a specific notification
router.delete('/notifications/:vendorId', verifyToken, requireRole('admin'), clearNotification);

// Clear all notifications
router.delete('/notifications', verifyToken, requireRole('admin'), clearAllNotifications);

export default router;

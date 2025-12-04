import express from 'express';
import { verifyToken, requireRole } from '../middleware/authMiddleware.js';
import { getAdminNotifications, clearNotification, clearOrderNotification, clearAllNotifications } from '../controllers/notificationController.js';
import { addSseClient, removeSseClient } from '../services/notificationService.js';
import { default as client } from '../config/redis.js';

const router = express.Router();

// Get admin notifications (vendor registrations, etc.)
router.get('/notifications', verifyToken, requireRole('admin'), getAdminNotifications);

// Server-Sent Events stream for admin notifications (real-time)
// Accepts token as query param if Authorization header is not present.
router.get('/notifications/stream', (req, res, next) => {
	// allow token via query for EventSource (dev-friendly)
	if (!req.headers.authorization && req.query && req.query.token) {
		req.headers.authorization = `Bearer ${req.query.token}`;
	}
	next();
}, verifyToken, requireRole('admin'), (req, res) => {
	// Set SSE headers
	res.setHeader('Content-Type', 'text/event-stream');
	res.setHeader('Cache-Control', 'no-cache');
	res.setHeader('Connection', 'keep-alive');
	res.flushHeaders && res.flushHeaders();

	// Send a comment to keep connection alive
	res.write(':ok\n\n');

	addSseClient(res);

	// Remove client on close
	req.on('close', () => {
		removeSseClient(res);
	});
});

// Clear a specific notification
router.delete('/notifications/:vendorId', verifyToken, requireRole('admin'), clearNotification);

// Clear delayed-order notification by order id
router.delete('/notifications/order/:orderId', verifyToken, requireRole('admin'), clearOrderNotification);

// Clear all notifications
router.delete('/notifications', verifyToken, requireRole('admin'), clearAllNotifications);

export default router;

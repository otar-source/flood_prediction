// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getNotificationsPage,
  apiList,
  apiUnreadCount,
  apiMarkRead,
  apiMarkAllRead,
  apiDelete
} = require('../controllers/notificationController');

// HTML page
router.get('/notifications', requireAuth, getNotificationsPage);

// JSON APIs — all require authentication
router.get ('/api/notifications',                requireAuth, apiList);
router.get ('/api/notifications/unread-count',   requireAuth, apiUnreadCount);
router.post('/api/notifications/read-all',       requireAuth, apiMarkAllRead);
router.post('/api/notifications/:id/read',       requireAuth, apiMarkRead);
router.post('/api/notifications/:id/delete',     requireAuth, apiDelete);

module.exports = router;
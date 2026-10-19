// routes/routeRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getRoutePage, checkRoute } = require('../controllers/routeController');

// Route page (protected)
router.get('/route', requireAuth, getRoutePage);

// JSON API for route lookup (protected — we save history + notify the user)
router.post('/api/route/check', requireAuth, checkRoute);

module.exports = router;
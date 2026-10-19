// routes/dashboardRoutes.js
const express = require('express');
const router = express.Router();
const { getHome, getDashboard } = require('../controllers/dashboardController');
const { requireAuth } = require('../middleware/auth');

// Public home
router.get('/', getHome);

// Protected dashboard
router.get('/dashboard', requireAuth, getDashboard);

module.exports = router;
// routes/predictionRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  runPredictionNow,
  apiGetLatestPredictions
} = require('../controllers/predictionController');

// Admin trigger
router.post('/admin/predictions/run', requireAuth, requireAdmin, runPredictionNow);

// Public JSON API
router.get('/api/predictions', apiGetLatestPredictions);

module.exports = router;
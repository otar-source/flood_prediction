// routes/mapRoutes.js
const express = require('express');
const router = express.Router();
const {
  getMapPage,
  apiGetVerifiedReports,
  apiGetLatestPredictions
} = require('../controllers/mapController');

// Full-page map (public)
router.get('/map', getMapPage);

// Public JSON APIs
router.get('/api/map/reports', apiGetVerifiedReports);
router.get('/api/map/predictions', apiGetLatestPredictions);

module.exports = router;
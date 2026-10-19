// routes/reportRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getReportPage,
  postReport,
  getMyReports
} = require('../controllers/reportController');

// Report flood page (protected)
router.get('/report', requireAuth, getReportPage);

// Submit report (protected, single image field)
router.post('/report', requireAuth, upload.single('image'), postReport);

// User's own reports (protected)
router.get('/report/my', requireAuth, getMyReports);

module.exports = router;
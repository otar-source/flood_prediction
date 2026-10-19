// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const {
  getDashboard, getUsers, toggleUserStatus,
  getReports, verifyReport, rejectReport, getLogs, getPredictions
} = require('../controllers/adminController');
const { rejectReportRules, mongoIdParam, handleFormValidation } = require('../middleware/validate');

// All admin routes require authentication + admin role (server-side)
router.use(requireAuth);
router.use(requireAdmin);

router.get('/admin', getDashboard);

router.get('/admin/users', getUsers);
router.post('/admin/users/:id/toggle',
  mongoIdParam('id'),
  handleFormValidation('/admin/users'),
  toggleUserStatus);

router.get('/admin/reports', getReports);
router.post('/admin/reports/:id/verify',
  mongoIdParam('id'),
  handleFormValidation('/admin/reports'),
  verifyReport);
router.post('/admin/reports/:id/reject',
  rejectReportRules,
  handleFormValidation('/admin/reports'),
  rejectReport);

router.get('/admin/logs', getLogs);
router.get('/admin/predictions', getPredictions);

module.exports = router;
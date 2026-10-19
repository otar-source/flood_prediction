// controllers/dashboardController.js
const FloodPrediction = require('../models/FloodPrediction');
const FloodReport = require('../models/FloodReport');
const Route = require('../models/Route');

// Home page
const getHome = (req, res) => {
  // Optionally decode user from cookie if present
  let user = null;
  try {
    const jwt = require('jsonwebtoken');
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = { name: 'User', role: decoded.role }; // Minimal info for home nav
    }
  } catch (e) { /* ignore */ }

  res.render('pages/index', { user, flash: null });
};

// User dashboard
const getDashboard = async (req, res) => {
  try {
    const userId = req.user._id;

    // 1. Current flood warnings (latest prediction per location with risk != Low)
    const warnings = await FloodPrediction.find({ risk_level: { $in: ['Moderate', 'High'] } })
      .sort({ prediction_date: -1 })
      .limit(5)
      .lean();

    // 2. Recent verified flood reports
    const recentReports = await FloodReport.find({ status: 'verified' })
      .sort({ reported_at: -1 })
      .limit(6)
      .lean();

    // 3. High-risk locations (recent predictions with High risk)
    const highRiskLocations = await FloodPrediction.find({ risk_level: 'High' })
      .sort({ prediction_date: -1 })
      .limit(5)
      .lean();

    // 4. User's own submitted reports
    const myReports = await FloodReport.find({ user_id: userId })
      .sort({ reported_at: -1 })
      .limit(10)
      .lean();

    res.render('pages/dashboard', {
      user: req.user,
      warnings,
      recentReports,
      highRiskLocations,
      myReports,
      flash: null
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).send('Dashboard error: ' + error.message);
  }
};

module.exports = { getHome, getDashboard };
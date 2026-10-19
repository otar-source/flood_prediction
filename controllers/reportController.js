// controllers/reportController.js
const FloodReport = require('../models/FloodReport');
const SystemLog = require('../models/SystemLog');

// Show Report Flood page
const getReportPage = (req, res) => {
  res.render('pages/report', {
    user: req.user,
    error: null,
    success: null
  });
};

// Handle submission of a new flood report
const postReport = async (req, res) => {
  try {
    const { location, road_name, severity, description, latitude, longitude } = req.body;

    // Validation
    if (!location || !severity || !latitude || !longitude) {
      return res.render('pages/report', {
        user: req.user,
        error: 'Location, severity, and coordinates (lat/lng) are required.',
        success: null
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.render('pages/report', {
        user: req.user,
        error: 'Invalid latitude or longitude.',
        success: null
      });
    }

    if (!['Low', 'Medium', 'High'].includes(severity)) {
      return res.render('pages/report', {
        user: req.user,
        error: 'Invalid severity value.',
        success: null
      });
    }

    // Handle optional image
    let image_url = null;
    if (req.file) {
      image_url = `/uploads/${req.file.filename}`;
    }

    // Create report
    const report = await FloodReport.create({
      user_id: req.user._id,
      location,
      road_name: road_name || location,
      severity,
      description: description || '',
      latitude: lat,
      longitude: lng,
      image_url,
      status: 'pending'
    });

    // Log action
    await SystemLog.create({
      user_id: req.user._id,
      action: `Submitted flood report ${report.report_id} for ${location}`,
      ip_address: req.ip || req.connection.remoteAddress
    });

    res.cookie('flash', JSON.stringify({
      type: 'success',
      message: 'Flood report submitted successfully! It is now pending admin verification.'
    }));
    res.redirect('/report/my');
  } catch (error) {
    console.error('Report submission error:', error);
    res.render('pages/report', {
      user: req.user,
      error: 'Failed to submit report: ' + error.message,
      success: null
    });
  }
};

// Show user's own reports
const getMyReports = async (req, res) => {
  try {
    const reports = await FloodReport.find({ user_id: req.user._id })
      .sort({ reported_at: -1 })
      .lean();

    res.render('pages/myReports', {
      user: req.user,
      reports,
      flash: null
    });
  } catch (error) {
    console.error('My reports error:', error);
    res.status(500).send('Error loading your reports: ' + error.message);
  }
};

module.exports = {
  getReportPage,
  postReport,
  getMyReports
};
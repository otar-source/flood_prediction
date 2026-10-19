// controllers/adminController.js
const User = require('../models/User');
const FloodReport = require('../models/FloodReport');
const FloodPrediction = require('../models/FloodPrediction');
const SystemLog = require('../models/SystemLog');
const Notification = require('../models/Notification');

/**
 * Admin Dashboard — summary counts + recent activity
 */
const getDashboard = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingReports,
      verifiedReports,
      totalReports,
      recentLogs,
      latestPredictions
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ status: 'active' }),
      FloodReport.countDocuments({ status: 'pending' }),
      FloodReport.countDocuments({ status: 'verified' }),
      FloodReport.countDocuments({}),
      SystemLog.find({}).sort({ timestamp: -1 }).limit(8).populate('user_id', 'name email').lean(),
      FloodPrediction.find({}).sort({ prediction_date: -1 }).limit(5).lean()
    ]);

    res.render('pages/admin/dashboard', {
      user: req.user,
      stats: {
        totalUsers,
        activeUsers,
        pendingReports,
        verifiedReports,
        totalReports
      },
      recentLogs,
      latestPredictions,
      flash: null
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Error loading admin dashboard: ' + err.message);
  }
};

/**
 * Users list + activate/deactivate
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).sort({ created_at: -1 }).lean();
    res.render('pages/admin/users', {
      user: req.user,
      users,
      flash: null
    });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).send('Error loading users: ' + err.message);
  }
};

const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const target = await User.findById(id);
    if (!target) {
      res.cookie('flash', JSON.stringify({ type: 'danger', message: 'User not found.' }));
      return res.redirect('/admin/users');
    }

    // Prevent admin from deactivating themselves
    if (target._id.toString() === req.user._id.toString()) {
      res.cookie('flash', JSON.stringify({ type: 'danger', message: 'You cannot change your own status.' }));
      return res.redirect('/admin/users');
    }

    target.status = target.status === 'active' ? 'inactive' : 'active';
    await target.save();

    await SystemLog.create({
      user_id: req.user._id,
      action: `Admin changed status of ${target.email} to ${target.status}`,
      ip_address: req.ip || req.connection.remoteAddress
    });

    res.cookie('flash', JSON.stringify({
      type: 'success',
      message: `User ${target.email} is now ${target.status}.`
    }));
    res.redirect('/admin/users');
  } catch (err) {
    console.error('Toggle user error:', err);
    res.cookie('flash', JSON.stringify({ type: 'danger', message: 'Error updating user.' }));
    res.redirect('/admin/users');
  }
};

/**
 * Reports list + verify/reject
 */
const getReports = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && ['pending', 'verified', 'rejected'].includes(status)) {
      filter.status = status;
    }

    const reports = await FloodReport.find(filter)
      .sort({ reported_at: -1 })
      .populate('user_id', 'name email')
      .lean();

    res.render('pages/admin/reports', {
      user: req.user,
      reports,
      filterStatus: status || 'all',
      flash: null
    });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).send('Error loading reports: ' + err.message);
  }
};

// controllers/adminController.js
// ... (imports unchanged, add the two below)
const MONITORED_LOCATIONS = require('../config/monitoredLocations');
const { distanceKm, NEAR_HIGH_RISK_KM } = require('../services/routeService');

const verifyReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await FloodReport.findById(id);
    if (!report) {
      res.cookie('flash', JSON.stringify({ type: 'danger', message: 'Report not found.' }));
      return res.redirect('/admin/reports');
    }

    report.status = 'verified';
    report.rejection_reason = undefined;
    await report.save();

    await SystemLog.create({
      user_id: req.user._id,
      action: `Admin verified flood report ${report.report_id} (${report.location})`,
      ip_address: req.ip || req.connection.remoteAddress
    });

    // Always notify the reporter
    await Notification.create({
      user_id: report.user_id,
      title: 'Your flood report was verified',
      message: `Your report for "${report.location}" (${report.severity} severity) has been verified and is now visible on the public map.`,
      type: 'system',
      status: 'unread'
    });

    // NEW (Step 10a): if High severity AND near a monitored location,
    // notify all active users (except the reporter).
    if (report.severity === 'High') {
      const nearMonitored = MONITORED_LOCATIONS.find((loc) =>
        distanceKm(report.latitude, report.longitude, loc.latitude, loc.longitude) <= NEAR_HIGH_RISK_KM
      );

      if (nearMonitored) {
        const users = await User.find({
          status: 'active',
          _id: { $ne: report.user_id }
        }).select('_id');

        const notifs = users.map((u) => ({
          user_id: u._id,
          title: `⚠️ High-severity flood near ${nearMonitored.name}`,
          message: `A High-severity flood has been verified at "${report.location}", near the monitored location "${nearMonitored.name}". Avoid the area if possible.`,
          type: 'flood_warning',
          status: 'unread'
        }));
        if (notifs.length) await Notification.insertMany(notifs);
      }
    }

    res.cookie('flash', JSON.stringify({ type: 'success', message: 'Report verified successfully.' }));
    res.redirect('/admin/reports');
  } catch (err) {
    console.error('Verify report error:', err);
    res.cookie('flash', JSON.stringify({ type: 'danger', message: 'Error verifying report.' }));
    res.redirect('/admin/reports');
  }
};

const rejectReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const report = await FloodReport.findById(id);
    if (!report) {
      res.cookie('flash', JSON.stringify({ type: 'danger', message: 'Report not found.' }));
      return res.redirect('/admin/reports');
    }

    report.status = 'rejected';
    report.rejection_reason = (reason || '').trim() || 'No reason provided.';
    await report.save();

    await SystemLog.create({
      user_id: req.user._id,
      action: `Admin rejected flood report ${report.report_id} (reason: ${report.rejection_reason})`,
      ip_address: req.ip || req.connection.remoteAddress
    });

    // Notify the reporting user
    await Notification.create({
      user_id: report.user_id,
      title: 'Your flood report was rejected',
      message: `Your report for "${report.location}" was rejected. Reason: ${report.rejection_reason}`,
      type: 'system',
      status: 'unread'
    });

    res.cookie('flash', JSON.stringify({ type: 'success', message: 'Report rejected.' }));
    res.redirect('/admin/reports');
  } catch (err) {
    console.error('Reject report error:', err);
    res.cookie('flash', JSON.stringify({ type: 'danger', message: 'Error rejecting report.' }));
    res.redirect('/admin/reports');
  }
};

/**
 * System Logs
 */
const getLogs = async (req, res) => {
  try {
    const logs = await SystemLog.find({})
      .sort({ timestamp: -1 })
      .limit(300)
      .populate('user_id', 'name email role')
      .lean();

    res.render('pages/admin/logs', {
      user: req.user,
      logs,
      flash: null
    });
  } catch (err) {
    console.error('Admin logs error:', err);
    res.status(500).send('Error loading logs: ' + err.message);
  }
};

/**
 * Predictions list
 */
const getPredictions = async (req, res) => {
  try {
    const predictions = await FloodPrediction.find({})
      .sort({ prediction_date: -1 })
      .limit(200)
      .lean();

    res.render('pages/admin/predictions', {
      user: req.user,
      predictions,
      flash: null
    });
  } catch (err) {
    console.error('Admin predictions error:', err);
    res.status(500).send('Error loading predictions: ' + err.message);
  }
};

module.exports = {
  getDashboard,
  getUsers,
  toggleUserStatus,
  getReports,
  verifyReport,
  rejectReport,
  getLogs,
  getPredictions
};
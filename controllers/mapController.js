// controllers/mapController.js
const FloodReport = require('../models/FloodReport');
const FloodPrediction = require('../models/FloodPrediction');
const jwt = require('jsonwebtoken');

// GET /map  → render the full-page map view
const getMapPage = (req, res) => {
  // Try to decode the user for the navbar (optional — page is public)
  let user = null;
  try {
    const token = req.cookies.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      user = { name: 'User', role: decoded.role, _id: decoded.id };
    }
  } catch (e) { /* ignore */ }

  res.render('pages/map', { user, flash: null });
};

// GET /api/map/reports  → verified reports only (public on the map)
const apiGetVerifiedReports = async (req, res) => {
  try {
    const reports = await FloodReport.find({ status: 'verified' })
      .sort({ reported_at: -1 })
      .limit(500)
      .lean();

    const payload = reports.map(r => ({
      _id: r._id,
      report_id: r.report_id,
      location: r.location,
      road_name: r.road_name || r.location,
      latitude: r.latitude,
      longitude: r.longitude,
      severity: r.severity,
      description: r.description || '',
      image_url: r.image_url || null,
      reported_at: r.reported_at
    }));

    res.json({ ok: true, count: payload.length, reports: payload });
  } catch (err) {
    console.error('API map reports error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

// GET /api/map/predictions  → latest prediction per monitored location
const apiGetLatestPredictions = async (req, res) => {
  try {
    const latest = await FloodPrediction.aggregate([
      { $sort: { prediction_date: -1 } },
      {
        $group: {
          _id: '$location',
          doc: { $first: '$$ROOT' }
        }
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { risk_level: -1, location: 1 } }
    ]);

    const payload = latest.map(p => ({
      _id: p._id,
      prediction_id: p.prediction_id,
      location: p.location,
      latitude: p.latitude,
      longitude: p.longitude,
      risk_level: p.risk_level,
      rainfall_value: p.rainfall_value,
      confidence: p.confidence,
      prediction_date: p.prediction_date
    }));

    res.json({ ok: true, count: payload.length, predictions: payload });
  } catch (err) {
    console.error('API map predictions error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

module.exports = {
  getMapPage,
  apiGetVerifiedReports,
  apiGetLatestPredictions
};
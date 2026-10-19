// controllers/predictionController.js
const SystemLog = require('../models/SystemLog');
const FloodPrediction = require('../models/FloodPrediction');
const { runFullPrediction } = require('../services/predictionEngine');

// POST /admin/predictions/run  (admin only)
const runPredictionNow = async (req, res) => {
  try {
    const summary = await runFullPrediction();

    // Log the action
    await SystemLog.create({
      user_id: req.user._id,
      action: `Ran flood prediction (${summary.succeeded}/${summary.total} succeeded, ${summary.failed} failed)`,
      ip_address: req.ip || req.connection.remoteAddress
    });

    const msg =
      summary.failed === 0
        ? `Prediction completed for ${summary.succeeded} location(s).`
        : `Prediction completed: ${summary.succeeded} succeeded, ${summary.failed} failed.`;

    res.cookie('flash', JSON.stringify({
      type: summary.failed === 0 ? 'success' : 'warning',
      message: msg
    }));
    res.redirect('/admin/predictions');
  } catch (err) {
    console.error('Prediction run error:', err);
    res.cookie('flash', JSON.stringify({
      type: 'danger',
      message: 'Prediction failed: ' + err.message
    }));
    res.redirect('/admin/predictions');
  }
};

// GET /api/predictions  (public – latest prediction per location)
// Used by the map (Step 8) and dashboard.
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
      { $sort: { risk_level: 1, location: 1 } }
    ]);
    res.json({ ok: true, count: latest.length, predictions: latest });
  } catch (err) {
    console.error('API predictions error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};

module.exports = { runPredictionNow, apiGetLatestPredictions };
// controllers/routeController.js
const Route = require('../models/Route');
const Notification = require('../models/Notification');
const SystemLog = require('../models/SystemLog');
const { findSafeRoute } = require('../services/routeService');

// GET /route — page
const getRoutePage = (req, res) => {
  res.render('pages/route', { user: req.user, flash: null });
};

// POST /api/route/check — JSON API
const checkRoute = async (req, res) => {
  try {
    const { origin, destination } = req.body || {};

    if (
      !origin || !destination ||
      typeof origin.lat !== 'number' || typeof origin.lng !== 'number' ||
      typeof destination.lat !== 'number' || typeof destination.lng !== 'number'
    ) {
      return res.status(400).json({
        ok: false,
        message: 'Origin and destination with numeric lat/lng are required.'
      });
    }

    const result = await findSafeRoute(origin, destination);

    // If a route was found, persist it and possibly notify the user
    if (result.ok) {
      try {
        await Route.create({
          user_id: req.user._id,
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          recommended_route: result.polyline,
          distance: result.distance,
          estimated_time: result.estimatedTimeMin,
          avoided_roads: result.avoided_roads
        });

        await SystemLog.create({
          user_id: req.user._id,
          action:
            `Route check: (${origin.lat.toFixed(4)},${origin.lng.toFixed(4)}) -> ` +
            `(${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}) — ` +
            `${result.distance.toFixed(2)} km, ${result.estimatedTimeMin} min`,
          ip_address: req.ip || req.connection.remoteAddress
        });

        // If route passes near a high-risk zone, create a warning notification
        if (result.highRiskHits && result.highRiskHits.length > 0) {
          const locs = result.highRiskHits.map((h) => h.location).join(', ');
          const minKm = Math.min(...result.highRiskHits.map((h) => h.distanceKm));
          await Notification.create({
            user_id: req.user._id,
            title: '⚠️ Safe route passes near a high-risk flood zone',
            message:
              `Your recommended route comes within ${minKm.toFixed(2)} km of high-risk ` +
              `flood zone(s): ${locs}. Please stay alert.`,
            type: 'route_warning',
            status: 'unread'
          });
        }
      } catch (saveErr) {
        // Non-fatal: still return the route to the user
        console.error('Route save/notify error (non-fatal):', saveErr.message);
      }
    }

    return res.json(result);
  } catch (err) {
    console.error('Route check error:', err);
    return res.status(500).json({ ok: false, message: 'Server error: ' + err.message });
  }
};

module.exports = { getRoutePage, checkRoute };
// services/predictionEngine.js
// ⚠️ RULE-BASED PREDICTION ENGINE
// This is intentionally simple and clearly labelled so it can be swapped
// for a proper ML model later. The whole file is a drop-in replacement point:
// just implement `predictForLocation()` differently and everything else
// (routes, cron, admin UI) continues to work.

const RainfallData = require('../models/RainfallData');
const FloodPrediction = require('../models/FloodPrediction');
const FloodReport = require('../models/FloodReport');
const { getRainfallForLocation } = require('./weatherService');
const MONITORED_LOCATIONS = require('../config/monitoredLocations');

// How close (in km) a verified report must be to influence a location's risk.
const REPORT_RADIUS_KM = 5;

// Haversine distance (km)
function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// --- RULE-BASED THRESHOLDS (swap for ML later) ---
function riskFromRainfall(mm) {
  if (mm < 20) return 'Low';
  if (mm <= 50) return 'Moderate';
  return 'High';
}

// Bump one level: Low -> Moderate -> High
function boostRisk(level) {
  if (level === 'Low') return 'Moderate';
  if (level === 'Moderate') return 'High';
  return 'High';
}

/**
 * Run prediction for a single monitored location.
 * 1) Fetch current rainfall (API or simulated).
 * 2) Save it to RainfallData.
 * 3) Compute base risk from rainfall.
 * 4) Look for verified flood reports within REPORT_RADIUS_KM and boost.
 * 5) Save a FloodPrediction row with a confidence score.
 */
async function predictForLocation(loc) {
  // 1) Rainfall
  const { rainfall_amount, source } = await getRainfallForLocation(
    loc.latitude,
    loc.longitude,
    loc.name
  );

  // 2) Save rainfall sample
  await RainfallData.create({
    location: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    rainfall_amount,
    source
  });

  // 3) Base risk
  let risk = riskFromRainfall(rainfall_amount);
  let confidence = source === 'api' ? 75 : 55; // lower confidence for simulated data

  // 4) Nearby verified reports boost
  const verified = await FloodReport.find({
    status: 'verified',
    latitude: { $gte: loc.latitude - 0.1, $lte: loc.latitude + 0.1 },
    longitude: { $gte: loc.longitude - 0.1, $lte: loc.longitude + 0.1 }
  }).lean();

  const nearby = verified.filter(
    (r) =>
      distanceKm(loc.latitude, loc.longitude, r.latitude, r.longitude) <=
      REPORT_RADIUS_KM
  );

  const hasHighReport = nearby.some((r) => r.severity === 'High');
  const hasMediumReport = nearby.some((r) => r.severity === 'Medium');

  if (hasHighReport) {
    risk = boostRisk(risk);
    confidence += 10;
  } else if (hasMediumReport) {
    confidence += 5;
  }

  // Clamp confidence to [0, 100]
  confidence = Math.max(0, Math.min(100, confidence));

  // 5) Save prediction
  const prediction = await FloodPrediction.create({
    location: loc.name,
    latitude: loc.latitude,
    longitude: loc.longitude,
    risk_level: risk,
    rainfall_value: rainfall_amount,
    confidence
  });

  return {
    location: loc.name,
    rainfall_amount,
    source,
    risk_level: risk,
    confidence,
    nearby_reports: nearby.length,
    prediction_id: prediction.prediction_id
  };
}

/**
 * Run prediction across ALL monitored locations. Returns a summary.
 */
async function runFullPrediction() {
  const startedAt = new Date();
  const results = [];
  const errors = [];

  for (const loc of MONITORED_LOCATIONS) {
    try {
      const r = await predictForLocation(loc);
      results.push(r);
    } catch (err) {
      console.error(`[predictionEngine] Failed for ${loc.name}:`, err.message);
      errors.push({ location: loc.name, error: err.message });
    }
  }

  return {
    startedAt,
    finishedAt: new Date(),
    total: MONITORED_LOCATIONS.length,
    succeeded: results.length,
    failed: errors.length,
    results,
    errors
  };
}

module.exports = {
  runFullPrediction,
  predictForLocation,
  riskFromRainfall,
  boostRisk,
  distanceKm,
  REPORT_RADIUS_KM
};
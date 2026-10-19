// services/routeService.js
// Builds a graph from the Roads collection and runs Dijkstra's algorithm.
//
// RULES (per spec):
//   - Roads with status "affected" or "closed"    -> EXCLUDED
//   - Roads with flood_risk = "High"              -> EXCLUDED
//   - Roads with flood_risk = "Moderate"          -> weight x3
//   - Roads with flood_risk = "Low"               -> weight x1

const Road = require('../models/Road');
const FloodPrediction = require('../models/FloodPrediction');

const AFFECTED_STATUSES = ['affected', 'closed'];
const MODERATE_MULTIPLIER = 3;
const NEAR_HIGH_RISK_KM = 1.5; // distance at which we consider a route "passing near"

// ---- Helpers ----
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

// Round to ~1m precision for node identity
function nodeKey(lat, lng) {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

// ---- Graph construction ----
async function buildGraph() {
  const roads = await Road.find({}).lean();

  const nodes = new Map();      // key -> { lat, lng }
  const adjacency = new Map();  // key -> [{ to, road, distance, weight }]
  const excluded = [];          // for avoided_roads reporting
  const included = [];

  for (const road of roads) {
    const isExcludedStatus = AFFECTED_STATUSES.includes(road.status);
    const isHighRisk = road.flood_risk === 'High';

    if (isExcludedStatus || isHighRisk) {
      excluded.push({
        road_name: road.road_name,
        reason: isExcludedStatus ? `status=${road.status}` : 'flood_risk=High'
      });
      continue;
    }

    const s = road.start_point;
    const e = road.end_point;
    if (!s || !e) continue;

    const sKey = nodeKey(s.lat, s.lng);
    const eKey = nodeKey(e.lat, e.lng);

    if (!nodes.has(sKey)) nodes.set(sKey, { lat: s.lat, lng: s.lng });
    if (!nodes.has(eKey)) nodes.set(eKey, { lat: e.lat, lng: e.lng });

    const baseDist = distanceKm(s.lat, s.lng, e.lat, e.lng);
    const multiplier = road.flood_risk === 'Moderate' ? MODERATE_MULTIPLIER : 1;
    const weight = baseDist * multiplier;

    if (!adjacency.has(sKey)) adjacency.set(sKey, []);
    if (!adjacency.has(eKey)) adjacency.set(eKey, []);
    adjacency.get(sKey).push({ to: eKey, road, distance: baseDist, weight });
    adjacency.get(eKey).push({ to: sKey, road, distance: baseDist, weight });

    included.push(road.road_name);
  }

  return { nodes, adjacency, excluded, included };
}

// Snap any coordinate to the nearest graph node
function snapToNearestNode(graph, lat, lng) {
  let bestKey = null;
  let bestDist = Infinity;
  for (const [key, node] of graph.nodes) {
    const d = distanceKm(lat, lng, node.lat, node.lng);
    if (d < bestDist) {
      bestDist = d;
      bestKey = key;
    }
  }
  return { key: bestKey, distanceKm: bestDist };
}

// ---- Dijkstra ----
function dijkstra(graph, startKey, endKey) {
  const distances = new Map();
  const previous = new Map();  // key -> { fromKey, road }
  const visited = new Set();
  const unvisited = new Set(graph.nodes.keys());

  for (const k of graph.nodes.keys()) distances.set(k, Infinity);
  distances.set(startKey, 0);

  while (unvisited.size) {
    // select node with smallest tentative distance
    let current = null;
    let minDist = Infinity;
    for (const k of unvisited) {
      const d = distances.get(k);
      if (d < minDist) { minDist = d; current = k; }
    }
    if (current === null || minDist === Infinity) break;
    if (current === endKey) break;

    unvisited.delete(current);
    visited.add(current);

    const neighbors = graph.adjacency.get(current) || [];
    for (const edge of neighbors) {
      if (visited.has(edge.to)) continue;
      const alt = distances.get(current) + edge.weight;
      if (alt < distances.get(edge.to)) {
        distances.set(edge.to, alt);
        previous.set(edge.to, { fromKey: current, road: edge.road });
      }
    }
  }

  if (startKey !== endKey && !previous.has(endKey)) {
    return null; // no path
  }

  // Reconstruct
  const pathKeys = [];
  const roadsUsed = []; // [{ road, fromKey }]
  let cur = endKey;
  pathKeys.push(cur);
  while (cur !== startKey) {
    const prev = previous.get(cur);
    if (!prev) return null;
    roadsUsed.push({ road: prev.road, fromKey: prev.fromKey });
    cur = prev.fromKey;
    pathKeys.push(cur);
  }
  pathKeys.reverse();
  roadsUsed.reverse();

  // Build an ordered polyline using each road's coordinates
  const polyline = [];
  let totalDistance = 0;
  for (const { road, fromKey } of roadsUsed) {
    totalDistance += distanceKm(
      road.start_point.lat, road.start_point.lng,
      road.end_point.lat, road.end_point.lng
    );

    const sKey = nodeKey(road.start_point.lat, road.start_point.lng);
    const coords = Array.isArray(road.coordinates) ? [...road.coordinates] : [];
    const ordered = sKey === fromKey ? coords : coords.slice().reverse();

    for (const [lng, lat] of ordered) {
      if (polyline.length === 0) {
        polyline.push([lat, lng]);
      } else {
        const [lastLat, lastLng] = polyline[polyline.length - 1];
        if (Math.abs(lastLat - lat) > 1e-6 || Math.abs(lastLng - lng) > 1e-6) {
          polyline.push([lat, lng]);
        }
      }
    }
  }

  const estimatedTimeMin = Math.round((totalDistance / 30) * 60); // avg 30 km/h

  return {
    pathKeys,
    roadsUsed: roadsUsed.map(({ road }) => road),
    polyline,
    distance: totalDistance,
    estimatedTimeMin
  };
}

// Detect if the polyline passes near any current High-risk prediction
async function checkHighRiskProximity(polyline) {
  const highRisk = await FloodPrediction.find({ risk_level: 'High' }).lean();
  const hits = [];
  for (const p of highRisk) {
    let minDist = Infinity;
    for (const [lat, lng] of polyline) {
      const d = distanceKm(lat, lng, p.latitude, p.longitude);
      if (d < minDist) minDist = d;
    }
    if (minDist <= NEAR_HIGH_RISK_KM) {
      hits.push({
        location: p.location,
        lat: p.latitude,
        lng: p.longitude,
        distanceKm: minDist,
        risk_level: p.risk_level
      });
    }
  }
  return hits;
}

// ---- Main entry point ----
async function findSafeRoute(origin, destination) {
  const graph = await buildGraph();

  if (graph.nodes.size === 0) {
    return {
      ok: false,
      reason: 'no_roads',
      message: 'No safe alternative route could be identified based on available information.',
      avoided_roads: graph.excluded.map((e) => e.road_name)
    };
  }

  const snapOrigin = snapToNearestNode(graph, origin.lat, origin.lng);
  const snapDest = snapToNearestNode(graph, destination.lat, destination.lng);

  if (!snapOrigin.key || !snapDest.key) {
    return {
      ok: false,
      reason: 'no_snap',
      message: 'No safe alternative route could be identified based on available information.'
    };
  }

  if (snapOrigin.key === snapDest.key) {
    return {
      ok: false,
      reason: 'same_node',
      message: 'Origin and destination resolve to the same road node. Choose two different points.',
      origin_snapped: graph.nodes.get(snapOrigin.key),
      destination_snapped: graph.nodes.get(snapDest.key),
      avoided_roads: graph.excluded.map((e) => e.road_name)
    };
  }

  const result = dijkstra(graph, snapOrigin.key, snapDest.key);

  if (!result) {
    return {
      ok: false,
      reason: 'no_path',
      message: 'No safe alternative route could be identified based on available information.',
      origin_snapped: graph.nodes.get(snapOrigin.key),
      destination_snapped: graph.nodes.get(snapDest.key),
      avoided_roads: graph.excluded.map((e) => e.road_name)
    };
  }

  const highRiskHits = await checkHighRiskProximity(result.polyline);

  return {
    ok: true,
    polyline: result.polyline,
    distance: result.distance,
    estimatedTimeMin: result.estimatedTimeMin,
    roadsUsed: result.roadsUsed.map((r) => ({
      road_id: r.road_id,
      road_name: r.road_name,
      flood_risk: r.flood_risk,
      status: r.status
    })),
    avoided_roads: graph.excluded.map((e) => e.road_name),
    highRiskHits,
    origin_snapped: graph.nodes.get(snapOrigin.key),
    destination_snapped: graph.nodes.get(snapDest.key),
    snap_distances: {
      origin_km: snapOrigin.distanceKm,
      destination_km: snapDest.distanceKm
    }
  };
}

module.exports = {
  findSafeRoute,
  buildGraph,
  distanceKm,
  nodeKey,
  NEAR_HIGH_RISK_KM
};
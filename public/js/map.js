// public/js/map.js
document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('floodMap');
  if (!mapEl) return;

  // Default center: Port Harcourt, Rivers State
  const PORT_HARCOURT = [4.8156, 7.0498];
  const REFRESH_MS = 60 * 1000; // 60 seconds

  // ---- Map init ----
  const map = L.map('floodMap', { zoomControl: true }).setView(PORT_HARCOURT, 12);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // ---- Layer groups (so we can toggle them) ----
  const reportsLayer = L.layerGroup().addTo(map);
  const predictionsLayer = L.layerGroup().addTo(map);

  // ---- Helpers ----
  const severityColor = (sev) => {
    const s = (sev || '').toLowerCase();
    if (s === 'high') return '#dc2626';
    if (s === 'medium' || s === 'moderate') return '#f59e0b';
    return '#16a34a';
  };

  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  // Custom colored pin per severity
  const makePin = (color) => L.divIcon({
    className: 'flood-pin',
    html: `<div class="pin-body" style="background:${color}"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -22]
  });

  // ---- State ----
  let reportMarkers = [];
  let predictionCircles = [];
  let lastRefresh = null;

  // ---- Render reports ----
  function renderReports(reports) {
    reportsLayer.clearLayers();
    reportMarkers = [];

    reports.forEach(r => {
      const color = severityColor(r.severity);
      const marker = L.marker([r.latitude, r.longitude], {
        icon: makePin(color),
        title: r.road_name || r.location
      });

      const img = r.image_url
        ? `<img src="${escapeHtml(r.image_url)}" alt="flood" class="popup-img">`
        : '';

      const popupHtml = `
        <div class="flood-popup">
          <div class="popup-head">
            <strong>${escapeHtml(r.road_name || r.location)}</strong>
            <span class="badge badge-${r.severity.toLowerCase()}">${escapeHtml(r.severity)}</span>
          </div>
          <div class="popup-body">
            <p>${escapeHtml(r.description) || 'No description provided.'}</p>
            ${img}
            <small class="muted">📍 ${r.latitude.toFixed(5)}, ${r.longitude.toFixed(5)}</small><br>
            <small class="muted">🕒 ${fmtDate(r.reported_at)}</small>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });
      marker.addTo(reportsLayer);
      reportMarkers.push({ marker, severity: r.severity, lat: r.latitude, lng: r.longitude });
    });
  }

  // ---- Render predictions ----
  function renderPredictions(predictions) {
    predictionsLayer.clearLayers();
    predictionCircles = [];

    // Base radius by risk (meters)
    const radiusFor = (risk) => {
      const r = (risk || '').toLowerCase();
      if (r === 'high') return 900;
      if (r === 'moderate') return 700;
      return 500;
    };

    predictions.forEach(p => {
      const color = severityColor(p.risk_level);
      const circle = L.circle([p.latitude, p.longitude], {
        radius: radiusFor(p.risk_level),
        color,
        weight: 2,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: 0.22
      });

      const popupHtml = `
        <div class="flood-popup">
          <div class="popup-head">
            <strong>${escapeHtml(p.location)}</strong>
            <span class="badge badge-${p.risk_level.toLowerCase()}">${escapeHtml(p.risk_level)}</span>
          </div>
          <div class="popup-body">
            <p>🌧️ Rainfall: <strong>${p.rainfall_value} mm</strong></p>
            <p>📊 Confidence: <strong>${p.confidence}%</strong></p>
            <small class="muted">🕒 ${fmtDate(p.prediction_date)}</small>
          </div>
        </div>
      `;

      circle.bindPopup(popupHtml);
      circle.addTo(predictionsLayer);
      predictionCircles.push({ circle, risk: p.risk_level, lat: p.latitude, lng: p.longitude });
    });
  }

  // ---- Fetch + refresh ----
  async function loadAll(showStatus = true) {
    const statusEl = document.getElementById('map-status');
    if (showStatus && statusEl) statusEl.textContent = 'Refreshing…';

    try {
      const [reportsResp, predsResp] = await Promise.all([
        fetch('/api/map/reports', { headers: { 'Accept': 'application/json' } }),
        fetch('/api/map/predictions', { headers: { 'Accept': 'application/json' } })
      ]);

      const reportsData = await reportsResp.json();
      const predsData = await predsResp.json();

      if (!reportsData.ok || !predsData.ok) {
        throw new Error('API returned an error');
      }

      renderReports(reportsData.reports || []);
      renderPredictions(predsData.predictions || []);

      lastRefresh = new Date();
      if (statusEl) {
        statusEl.textContent =
          `${reportsData.count} report(s), ${predsData.count} prediction zone(s) — updated ${lastRefresh.toLocaleTimeString()}`;
      }
    } catch (err) {
      console.error('Map load error:', err);
      if (statusEl) statusEl.textContent = '⚠️ Failed to load map data: ' + err.message;
    }
  }

  // ---- Layer toggles ----
  const toggleReports = document.getElementById('toggleReports');
  const togglePredictions = document.getElementById('togglePredictions');

  if (toggleReports) {
    toggleReports.addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(reportsLayer);
      else map.removeLayer(reportsLayer);
    });
  }
  if (togglePredictions) {
    togglePredictions.addEventListener('change', (e) => {
      if (e.target.checked) map.addLayer(predictionsLayer);
      else map.removeLayer(predictionsLayer);
    });
  }

  // ---- Manual refresh ----
  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) refreshBtn.addEventListener('click', () => loadAll(true));

  // ---- Initial load + 60s auto-refresh ----
  loadAll(true);
  setInterval(() => loadAll(false), REFRESH_MS);
});
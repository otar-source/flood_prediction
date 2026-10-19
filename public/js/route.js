// public/js/route.js
document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('routeMap');
  if (!mapEl) return;

  const PORT_HARCOURT = [4.8156, 7.0498];

  // --- Map init ---
  const map = L.map('routeMap').setView(PORT_HARCOURT, 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // --- DOM ---
  const originLatInput = document.getElementById('originLat');
  const originLngInput = document.getElementById('originLng');
  const destLatInput   = document.getElementById('destLat');
  const destLngInput   = document.getElementById('destLng');
  const originLabel    = document.getElementById('originLabel');
  const destLabel      = document.getElementById('destLabel');
  const setOriginBtn   = document.getElementById('setOriginBtn');
  const setDestBtn     = document.getElementById('setDestBtn');
  const findBtn        = document.getElementById('findRouteBtn');
  const resetBtn       = document.getElementById('resetRouteBtn');
  const resultBox      = document.getElementById('routeResult');

  // --- State ---
  let mode = null; // 'origin' | 'destination' | null
  let originMarker = null;
  let destMarker   = null;
  let routeLayer   = null;
  let hitLayer     = null;

  // --- Icons ---
  function originIcon() {
    return L.divIcon({
      className: 'route-marker',
      html: '<div class="marker-origin">O</div>',
      iconSize: [28, 28], iconAnchor: [14, 14]
    });
  }
  function destIcon() {
    return L.divIcon({
      className: 'route-marker',
      html: '<div class="marker-dest">D</div>',
      iconSize: [28, 28], iconAnchor: [14, 14]
    });
  }

  function setMode(newMode) {
    mode = newMode;
    setOriginBtn.classList.toggle('active', mode === 'origin');
    setDestBtn.classList.toggle('active', mode === 'destination');
    mapEl.style.cursor = mode ? 'crosshair' : '';
  }

  setOriginBtn.addEventListener('click', () => setMode(mode === 'origin' ? null : 'origin'));
  setDestBtn.addEventListener('click', () => setMode(mode === 'destination' ? null : 'destination'));

  // --- Map click to pick a point ---
  map.on('click', (e) => {
    if (!mode) return;
    const { lat, lng } = e.latlng;

    if (mode === 'origin') {
      if (originMarker) originMarker.setLatLng(e.latlng);
      else originMarker = L.marker(e.latlng, { icon: originIcon(), draggable: true }).addTo(map);
      originLatInput.value = lat.toFixed(6);
      originLngInput.value = lng.toFixed(6);
      originLabel.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } else {
      if (destMarker) destMarker.setLatLng(e.latlng);
      else destMarker = L.marker(e.latlng, { icon: destIcon(), draggable: true }).addTo(map);
      destLatInput.value = lat.toFixed(6);
      destLngInput.value = lng.toFixed(6);
      destLabel.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
    setMode(null);
  });

  // --- Dragging markers updates the inputs ---
  map.on('mouseup', () => {
    if (originMarker) {
      const p = originMarker.getLatLng();
      originLatInput.value = p.lat.toFixed(6);
      originLngInput.value = p.lng.toFixed(6);
      originLabel.textContent = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
    }
    if (destMarker) {
      const p = destMarker.getLatLng();
      destLatInput.value = p.lat.toFixed(6);
      destLngInput.value = p.lng.toFixed(6);
      destLabel.textContent = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`;
    }
  });

  // --- Manual coordinate input ---
  function syncFromInputs() {
    const oLat = parseFloat(originLatInput.value);
    const oLng = parseFloat(originLngInput.value);
    if (!isNaN(oLat) && !isNaN(oLng)) {
      if (originMarker) originMarker.setLatLng([oLat, oLng]);
      else originMarker = L.marker([oLat, oLng], { icon: originIcon(), draggable: true }).addTo(map);
      originLabel.textContent = `${oLat.toFixed(5)}, ${oLng.toFixed(5)}`;
    }
    const dLat = parseFloat(destLatInput.value);
    const dLng = parseFloat(destLngInput.value);
    if (!isNaN(dLat) && !isNaN(dLng)) {
      if (destMarker) destMarker.setLatLng([dLat, dLng]);
      else destMarker = L.marker([dLat, dLng], { icon: destIcon(), draggable: true }).addTo(map);
      destLabel.textContent = `${dLat.toFixed(5)}, ${dLng.toFixed(5)}`;
    }
  }
  [originLatInput, originLngInput, destLatInput, destLngInput].forEach((el) =>
    el.addEventListener('change', syncFromInputs)
  );

  // --- Reset ---
  resetBtn.addEventListener('click', () => {
    if (originMarker) { map.removeLayer(originMarker); originMarker = null; }
    if (destMarker) { map.removeLayer(destMarker); destMarker = null; }
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    if (hitLayer) { map.removeLayer(hitLayer); hitLayer = null; }
    originLatInput.value = '';
    originLngInput.value = '';
    destLatInput.value = '';
    destLngInput.value = '';
    originLabel.textContent = '—';
    destLabel.textContent = '—';
    resultBox.innerHTML = '';
    setMode(null);
  });

  // --- Find route ---
  findBtn.addEventListener('click', async () => {
    const oLat = parseFloat(originLatInput.value);
    const oLng = parseFloat(originLngInput.value);
    const dLat = parseFloat(destLatInput.value);
    const dLng = parseFloat(destLngInput.value);

    if ([oLat, oLng, dLat, dLng].some((v) => isNaN(v))) {
      resultBox.innerHTML =
        '<div class="alert alert-danger">Please set both origin and destination first.</div>';
      return;
    }

    resultBox.innerHTML = '<p class="muted">Finding safe route…</p>';

    try {
      const resp = await fetch('/api/route/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          origin: { lat: oLat, lng: oLng },
          destination: { lat: dLat, lng: dLng }
        })
      });
      const data = await resp.json();
      renderResult(data);
    } catch (err) {
      resultBox.innerHTML = `<div class="alert alert-danger">Network error: ${err.message}</div>`;
    }
  });

  // --- Render result ---
  function renderResult(data) {
    if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
    if (hitLayer)   { map.removeLayer(hitLayer);   hitLayer = null; }

    if (!data || !data.ok) {
      const msg = (data && data.message) ||
        'No safe alternative route could be identified based on available information.';
      resultBox.innerHTML = `<div class="alert alert-danger">${msg}</div>`;
      if (data && data.avoided_roads && data.avoided_roads.length) {
        resultBox.innerHTML +=
          `<p class="muted">Excluded roads: ${data.avoided_roads.join(', ')}</p>`;
      }
      return;
    }

    // Draw polyline
    if (Array.isArray(data.polyline) && data.polyline.length > 1) {
      routeLayer = L.layerGroup();
      const line = L.polyline(data.polyline, {
        color: '#2563eb', weight: 6, opacity: 0.85
      }).addTo(routeLayer);
      routeLayer.addTo(map);
      map.fitBounds(line.getBounds(), { padding: [40, 40] });
    }

    // Draw high-risk proximity zones
    if (Array.isArray(data.highRiskHits) && data.highRiskHits.length) {
      hitLayer = L.layerGroup();
      data.highRiskHits.forEach((h) => {
        L.circleMarker([h.lat, h.lng], {
          radius: 12, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 0.35
        })
          .bindPopup(`⚠️ High-risk zone nearby: ${h.location} (${h.distanceKm.toFixed(2)} km)`)
          .addTo(hitLayer);
      });
      hitLayer.addTo(map);
    }

    // Summary panel
    const usedList = (data.roadsUsed || [])
      .map((r) =>
        `<li>${r.road_name} <span class="badge badge-${r.flood_risk.toLowerCase()}">${r.flood_risk}</span></li>`
      )
      .join('');

    const avoidedList = (data.avoided_roads && data.avoided_roads.length)
      ? data.avoided_roads.map((r) => `<li>${r}</li>`).join('')
      : '<li class="muted">None</li>';

    const warningHtml = (data.highRiskHits && data.highRiskHits.length)
      ? `<div class="alert alert-warning">⚠️ Your route passes near ${data.highRiskHits.length} high-risk zone(s). A warning has been added to your notifications.</div>`
      : '';

    resultBox.innerHTML = `
      ${warningHtml}
      <div class="route-summary">
        <div class="route-stat">
          <span class="route-stat-value">${data.distance.toFixed(2)} km</span>
          <span class="route-stat-label">Distance</span>
        </div>
        <div class="route-stat">
          <span class="route-stat-value">${data.estimatedTimeMin} min</span>
          <span class="route-stat-label">Est. Time</span>
        </div>
        <div class="route-stat">
          <span class="route-stat-value">${data.roadsUsed.length}</span>
          <span class="route-stat-label">Roads</span>
        </div>
      </div>

      <h4>Roads Used</h4>
      <ul class="route-list">${usedList}</ul>

      <h4>Excluded Roads</h4>
      <ul class="route-list avoided">${avoidedList}</ul>
    `;
  }
});
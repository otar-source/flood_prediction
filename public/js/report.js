// public/js/report.js
document.addEventListener('DOMContentLoaded', () => {
  const mapEl = document.getElementById('reportMap');
  if (!mapEl) return;

  // Default to Port Harcourt, Rivers State
  const defaultLat = 4.8156;
  const defaultLng = 7.0498;
  const defaultZoom = 12;

  const map = L.map('reportMap').setView([defaultLat, defaultLng], defaultZoom);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Marker for picked location
  let marker = null;

  // Click handler
  map.on('click', (e) => {
    const { lat, lng } = e.latlng;

    if (marker) {
      marker.setLatLng(e.latlng);
    } else {
      marker = L.marker(e.latlng, { draggable: true }).addTo(map);
      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        setCoords(pos.lat, pos.lng);
      });
    }

    setCoords(lat, lng);
  });

  function setCoords(lat, lng) {
    const latInput = document.getElementById('latitude');
    const lngInput = document.getElementById('longitude');
    if (latInput) latInput.value = lat.toFixed(6);
    if (lngInput) lngInput.value = lng.toFixed(6);
  }

  // If a location search box is filled, try to center map (simple geocoding via Nominatim)
  const locationInput = document.getElementById('location');
  if (locationInput) {
    locationInput.addEventListener('blur', async () => {
      const q = locationInput.value.trim();
      if (!q) return;
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q + ', Rivers State, Nigeria')}`;
        const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await resp.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          const newLat = parseFloat(lat);
          const newLng = parseFloat(lon);
          map.setView([newLat, newLng], 14);
          if (marker) marker.setLatLng([newLat, newLng]);
          else marker = L.marker([newLat, newLng], { draggable: true }).addTo(map);
          setCoords(newLat, newLng);
        }
      } catch (err) {
        console.warn('Geocode failed:', err);
      }
    });
  }
});
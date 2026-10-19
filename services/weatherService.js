// services/weatherService.js
// Fetches current rainfall for a given coordinate from OpenWeatherMap.
// If the API key is missing/placeholder or the call fails, it returns
// a deterministic *simulated* value so the whole system remains usable
// in development/demo mode. The `source` field records which path was used.

const PLACEHOLDER_KEY = 'your_openweathermap_api_key_here';

const isRealKey = (key) =>
  !!key && key !== PLACEHOLDER_KEY && key.length > 20;

// Deterministic pseudo-rainfall (0–60 mm) so demo data is stable per (name, hour).
function simulateRainfall(name) {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hour = new Date().getHours();
  const v = (hash * 7 + hour * 13) % 600;
  return Math.round((v / 10) * 10) / 10; // 0.0 – 59.9 mm
}

/**
 * Get current rainfall (mm) for a coordinate.
 * @returns {Promise<{ rainfall_amount: number, source: 'api'|'manual' }>}
 */
async function getRainfallForLocation(lat, lng, locationName = '') {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!isRealKey(apiKey)) {
    return {
      rainfall_amount: simulateRainfall(locationName || `${lat},${lng}`),
      source: 'manual'
    };
  }

  const url =
    `https://api.openweathermap.org/data/2.5/weather` +
    `?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(`OpenWeatherMap HTTP ${resp.status} – ${text.slice(0, 120)}`);
    }
    const data = await resp.json();

    // OWM reports rain only when it is actually raining.
    const rainfall =
      (data.rain && (data.rain['1h'] || data.rain['3h'])) || 0;

    return { rainfall_amount: Number(rainfall), source: 'api' };
  } catch (err) {
    console.warn(`[weatherService] API failed for ${locationName}: ${err.message}. Falling back to simulated value.`);
    return {
      rainfall_amount: simulateRainfall(locationName || `${lat},${lng}`),
      source: 'manual'
    };
  }
}

module.exports = { getRainfallForLocation, isRealKey };
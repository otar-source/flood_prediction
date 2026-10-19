// middleware/security.js
// Central place for HTTP security headers and rate limiting.
// CSP is relaxed just enough for Leaflet + OpenStreetMap + unpkg CDN.

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// ---- Helmet (security headers) ----
const securityHeaders = helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      // We allow 'unsafe-inline' because we use a few inline <script> blocks
      // (dashboard widget, notifications page) and inline style attributes
      // from Leaflet. Move to external files if you want to drop this.
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://unpkg.com'
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        'https://unpkg.com'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'blob:',
        'https://*.tile.openstreetmap.org',
        'https://unpkg.com'
      ],
      connectSrc: [
        "'self'",
        'https://nominatim.openstreetmap.org',
        'https://api.openweathermap.org'
      ],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameAncestors: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  // Cross-origin resource policy needs to allow our own tile images/uploads
  crossOriginResourcePolicy: { policy: 'same-site' },
  // Don't block referrer for same-origin
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

// ---- Rate limiters ----

// Strict limiter for auth endpoints (login / register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  max: 10,                         // 10 attempts per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
  handler: (req, res) => {
    res.status(429);
    res.cookie('flash', JSON.stringify({
      type: 'danger',
      message: 'Too many authentication attempts. Please try again in 15 minutes.'
    }));
    res.redirect('/login');
  }
});

// API limiter (JSON endpoints)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many API requests. Slow down.' }
});

// General limiter (HTML pages) — generous so normal browsing never trips it
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests. Please slow down.'
});

module.exports = { securityHeaders, authLimiter, apiLimiter, generalLimiter };
// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const reportRoutes = require('./routes/reportRoutes');
const adminRoutes = require('./routes/adminRoutes');
const predictionRoutes = require('./routes/predictionRoutes');
const mapRoutes = require('./routes/mapRoutes');
const routeRoutes = require('./routes/routeRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const { flashMessages } = require('./middleware/auth');
const { securityHeaders, generalLimiter } = require('./middleware/security');
const { startScheduler } = require('./jobs/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

// Trust proxy when behind a reverse proxy (needed for correct req.ip with rate limiting)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// --- Security headers (helmet) ---
app.use(securityHeaders);

// --- Body + cookie parsing ---
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// --- Static assets ---
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  // Prevent uploads from being served as HTML/JS even if something slips in
  setHeaders: (res) => {
    res.setHeader('Content-Security-Policy', "default-src 'none'");
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// --- Flash ---
app.use(flashMessages);

// --- View engine ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Global rate limiter on HTML pages (authLimiter & apiLimiter are route-level) ---
app.use(generalLimiter);

// --- Routes ---
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/', reportRoutes);
app.use('/', adminRoutes);
app.use('/', predictionRoutes);
app.use('/', mapRoutes);
app.use('/', routeRoutes);
app.use('/', notificationRoutes);

// 404
app.use((req, res) => res.status(404).send('Page not found'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err.message);

  // Multer / upload errors → back to /report with a friendly message
  if (err.name === 'MulterError' || /image files|Invalid filename|MIME/i.test(err.message)) {
    res.cookie('flash', JSON.stringify({ type: 'danger', message: err.message }));
    return res.redirect('/report');
  }

  // JWT errors → back to login
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.clearCookie('token');
    return res.redirect('/login');
  }

  res.status(500).send('Server error: ' + err.message);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  startScheduler();
});
// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.redirect('/login');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user || user.status !== 'active') {
      res.clearCookie('token');
      return res.redirect('/login');
    }

    // Server-side role is fetched fresh from DB — never trusted from the token.
    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.redirect('/login');
  }
};

// Same as requireAuth but returns JSON for /api/* routes.
const requireAuthApi = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ ok: false, error: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password_hash');
    if (!user || user.status !== 'active') {
      res.clearCookie('token');
      return res.status(401).json({ ok: false, error: 'Not authenticated' });
    }
    req.user = user;
    next();
  } catch (error) {
    res.clearCookie('token');
    return res.status(401).json({ ok: false, error: 'Not authenticated' });
  }
};

// HTML admin gate.
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).render('pages/error', {
      message: 'Access denied. Admin privileges required.',
      user: req.user || null
    });
  }
  next();
};

// JSON admin gate.
const requireAdminApi = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ ok: false, error: 'Admin privileges required' });
  }
  next();
};

const flashMessages = (req, res, next) => {
  res.locals.flash = null;
  if (req.cookies.flash) {
    try {
      res.locals.flash = JSON.parse(req.cookies.flash);
      res.clearCookie('flash');
    } catch (e) { /* ignore */ }
  }
  next();
};

// Returns a hardened cookie-options object based on environment.
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

module.exports = {
  requireAuth,
  requireAuthApi,
  requireAdmin,
  requireAdminApi,
  flashMessages,
  cookieOptions
};
// middleware/validate.js
// Central validation rules for all forms and API payloads.
//
// Design decisions:
//  - We do NOT use .escape()/.blacklist() on free-text fields that are
//    rendered by EJS (<%= %>) because EJS already HTML-escapes at output.
//    Escaping at input would cause double-escaping (e.g. "&amp;lt;").
//    The correct pattern is: sanitize structure/format here, escape at output.
//  - We DO .trim() and enforce length limits (prevents oversize payloads).
//  - We DO normalizeEmail() to unify duplicate registrations.

const { body, param, query, validationResult } = require('express-validator');

// ---- Handlers ----

// For HTML form posts: redirect back with a flash message on failure.
// The view reads field-level errors from req.flash-style cookie (msg only).
const handleFormValidation = (redirectPath) => (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const first = errors.array()[0];
  res.cookie('flash', JSON.stringify({
    type: 'danger',
    message: first.msg || 'Invalid input.'
  }));
  return res.redirect(redirectPath);
};

// For JSON APIs: 400 with structured errors.
const handleJsonValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    ok: false,
    error: 'Validation failed',
    details: errors.array().map((e) => ({ field: e.path, msg: e.msg }))
  });
};

// ---- Rule sets ----

const registerRules = [
  body('name').trim().notEmpty().withMessage('Name is required.')
    .isLength({ min: 2, max: 80 }).withMessage('Name must be 2–80 characters.'),
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email.')
    .normalizeEmail(),
  body('password').isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6–128 characters.'),
  body('phone').trim().notEmpty().withMessage('Phone is required.')
    .matches(/^[0-9+\-\s()]{7,20}$/).withMessage('Invalid phone number.')
];

const loginRules = [
  body('email').trim().notEmpty().withMessage('Email is required.')
    .isEmail().withMessage('Please enter a valid email.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.')
    .isLength({ max: 128 }).withMessage('Password too long.')
];

const reportRules = [
  body('location').trim().notEmpty().withMessage('Location is required.')
    .isLength({ max: 120 }).withMessage('Location too long.'),
  body('road_name').optional({ checkFalsy: true }).trim()
    .isLength({ max: 120 }).withMessage('Road name too long.'),
  body('severity').isIn(['Low', 'Medium', 'High'])
    .withMessage('Severity must be Low, Medium, or High.'),
  body('description').optional({ checkFalsy: true }).trim()
    .isLength({ max: 500 }).withMessage('Description must be ≤ 500 characters.'),
  body('latitude').isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90.'),
  body('longitude').isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180.')
];

const rejectReportRules = [
  param('id').isMongoId().withMessage('Invalid report id.'),
  body('reason').trim().notEmpty().withMessage('Rejection reason is required.')
    .isLength({ min: 3, max: 300 }).withMessage('Reason must be 3–300 characters.')
];

const mongoIdParam = (name = 'id') => [
  param(name).isMongoId().withMessage('Invalid id.')
];

const routeCheckRules = [
  body('origin').isObject().withMessage('Origin must be an object {lat,lng}.'),
  body('origin.lat').isFloat({ min: -90, max: 90 })
    .withMessage('Origin latitude invalid.'),
  body('origin.lng').isFloat({ min: -180, max: 180 })
    .withMessage('Origin longitude invalid.'),
  body('destination').isObject().withMessage('Destination must be an object {lat,lng}.'),
  body('destination.lat').isFloat({ min: -90, max: 90 })
    .withMessage('Destination latitude invalid.'),
  body('destination.lng').isFloat({ min: -180, max: 180 })
    .withMessage('Destination longitude invalid.')
];

module.exports = {
  handleFormValidation,
  handleJsonValidation,
  registerRules,
  loginRules,
  reportRules,
  rejectReportRules,
  mongoIdParam,
  routeCheckRules
};
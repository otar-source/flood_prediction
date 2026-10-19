// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { 
  getRegister, 
  postRegister, 
  getLogin, 
  postLogin, 
  logout 
} = require('../controllers/authController');

// Register routes
router.get('/register', getRegister);
router.post('/register', postRegister);

// Login routes
router.get('/login', getLogin);
router.post('/login', postLogin);

// Logout
router.get('/logout', logout);

module.exports = router;
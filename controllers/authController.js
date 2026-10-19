// controllers/authController.js
const User = require('../models/User');
const SystemLog = require('../models/SystemLog');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Show registration page
const getRegister = (req, res) => {
  res.render('pages/register', { error: null, success: null });
};

// Process registration
const postRegister = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Basic validation
    if (!name || !email || !password || !phone) {
      return res.render('pages/register', { 
        error: 'All fields are required', 
        success: null 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render('pages/register', { 
        error: 'Email already registered', 
        success: null 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password_hash: hashedPassword,
      phone,
      role: 'user',
      status: 'active'
    });

    // Log registration action
    await SystemLog.create({
      user_id: user._id,
      action: 'User registered',
      ip_address: req.ip || req.connection.remoteAddress
    });

    // Set flash success and redirect to login
    res.cookie('flash', JSON.stringify({ type: 'success', message: 'Registration successful! Please log in.' }));
    res.redirect('/login');
  } catch (error) {
    console.error(error);
    res.render('pages/register', { 
      error: 'Server error. Please try again.', 
      success: null 
    });
  }
};

// Show login page
const getLogin = (req, res) => {
  res.render('pages/login', { error: null, success: null });
};

// Process login
const postLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('pages/login', { 
        error: 'Email and password are required', 
        success: null 
      });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.render('pages/login', { 
        error: 'Invalid email or password', 
        success: null 
      });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.render('pages/login', { 
        error: 'Your account is inactive. Contact admin.', 
        success: null 
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      // Log failed login attempt
      await SystemLog.create({
        user_id: user._id,
        action: 'Failed login attempt',
        ip_address: req.ip || req.connection.remoteAddress
      });
      return res.render('pages/login', { 
        error: 'Invalid email or password', 
        success: null 
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set httpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Log successful login
    await SystemLog.create({
      user_id: user._id,
      action: 'User logged in',
      ip_address: req.ip || req.connection.remoteAddress
    });

    // Set flash success and redirect to dashboard
    res.cookie('flash', JSON.stringify({ type: 'success', message: 'Welcome back!' }));
    res.redirect('/dashboard');
  } catch (error) {
    console.error(error);
    res.render('pages/login', { 
      error: 'Server error. Please try again.', 
      success: null 
    });
  }
};

// Logout
const logout = (req, res) => {
  res.clearCookie('token');
  res.cookie('flash', JSON.stringify({ type: 'success', message: 'Logged out successfully.' }));
  res.redirect('/');
};

module.exports = {
  getRegister,
  postRegister,
  getLogin,
  postLogin,
  logout
};
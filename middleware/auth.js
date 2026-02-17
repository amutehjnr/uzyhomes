// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT Token
exports.authenticateToken = async (req, res, next) => {
  console.log('🔐 authenticateToken middleware called');
  
  try {
    let token = null;
    
    // 1. Check Authorization header (Bearer token)
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Token found in Authorization header');
    }
    
    // 2. Check cookies
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token found in cookies');
    }
    
    // 3. Check session
    if (!token && req.session && req.session.token) {
      token = req.session.token;
      console.log('Token found in session');
    }

    if (!token) {
      console.log('❌ No token found - user not authenticated');
      req.user = null;
      return next();
    }

    console.log('Token found, verifying...');
    
    try {
      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified successfully for user ID:', decoded.id);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        console.log('❌ User not found in database');
        req.user = null;
        return next();
      }
      
      if (user.accountStatus === 'suspended') {
        console.log('❌ User account is suspended');
        req.user = null;
        return next();
      }
      
      console.log('✅ User authenticated:', user.email);
      req.user = user;
      next();
      
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      
      // Clear invalid cookie
      if (req.cookies && req.cookies.token) {
        res.clearCookie('token');
        res.clearCookie('isLoggedIn');
      }
      
      req.user = null;
      next();
    }
    
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    req.user = null;
    next();
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Generate JWT Token
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
exports.generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// Validation utilities
const { body, validationResult } = require('express-validator');

exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// User validation
exports.validateUserRegistration = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  })
];

exports.validateLogin = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];
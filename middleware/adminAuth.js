const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const logger = require('../config/logger');

// Generate JWT Token
const generateToken = (id) => {
  console.log('🔑 Generating token for user ID:', id);
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Generate Refresh Token
const generateRefreshToken = (id) => {
  console.log('🔄 Generating refresh token for user ID:', id);
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

// Verify Token
const verifyToken = (token, isRefreshToken = false) => {
  const secret = isRefreshToken ? (process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET) : process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};

// Protect routes middleware
const protect = async (req, res, next) => {
  console.log('\n🔐 ===== PROTECT MIDDLEWARE CALLED =====');
  console.log('Path:', req.path);
  console.log('Method:', req.method);
  
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📌 Token found in Authorization header');
    } 
    // Check for token in cookies
    else if (req.cookies && req.cookies.adminToken) {
      token = req.cookies.adminToken;
      console.log('📌 Token found in cookies (adminToken)');
    }
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('📌 Token found in cookies (token)');
    }

    if (!token) {
      console.log('❌ No token found');
      req.user = null;
      return next();
    }

    console.log('🔍 Verifying token...');

    try {
      const decoded = verifyToken(token);
      console.log('✅ Token verified successfully for ID:', decoded.id);
      
      // First try to find as Admin
      let user = await Admin.findById(decoded.id).select('-password');
      
      if (user) {
        console.log('✅ Admin found:', user.email);
        user.userType = 'admin';
        req.user = user;
      } else {
        // If not admin, try as regular user
        user = await User.findById(decoded.id).select('-password');
        if (user) {
          console.log('✅ User found:', user.email);
          user.userType = 'user';
          req.user = user;
        } else {
          console.log('❌ No user found with ID:', decoded.id);
          req.user = null;
        }
      }
      
      next();
      
    } catch (error) {
      console.log('❌ Token verification failed:', error.message);
      req.user = null;
      next();
    }
  } catch (error) {
    console.log('❌ Protect middleware error:', error.message);
    req.user = null;
    next();
  }
};

// Require admin middleware
const requireAdmin = (req, res, next) => {
  console.log('\n🔐 ===== REQUIRE ADMIN MIDDLEWARE =====');
  
  const isApiRequest = req.xhr || req.headers['accept'] === 'application/json';
  
  if (!req.user) {
    console.log('❌ No user in request');
    
    if (isApiRequest) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    return res.redirect('/admin/login');
  }

  console.log('👤 User email:', req.user.email);
  console.log('👤 User role:', req.user.role);
  console.log('👤 User type:', req.user.userType);

  // Check if user is admin or super_admin
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    console.log('❌ Insufficient permissions - not an admin');
    
    if (isApiRequest) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'You do not have permission to access this area'
    });
  }

  if (!req.user.isActive) {
    console.log('❌ Account is deactivated');
    
    if (isApiRequest) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    return res.status(403).render('error', {
      title: 'Access Denied',
      message: 'Your account has been deactivated'
    });
  }

  console.log('✅ Admin authorized');
  console.log('🔐 ===== REQUIRE ADMIN COMPLETE =====\n');
  next();
};

// Require authentication middleware (for regular users)
const requireAuth = (req, res, next) => {
  console.log('\n🔐 ===== REQUIRE AUTH MIDDLEWARE =====');
  
  const isApiRequest = req.xhr || req.headers['accept'] === 'application/json';
  
  if (!req.user) {
    console.log('❌ No user in request');
    
    if (isApiRequest) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    return res.redirect('/login');
  }

  console.log('✅ User authenticated:', req.user.email);
  console.log('🔐 ===== REQUIRE AUTH COMPLETE =====\n');
  next();
};

// Export all functions
module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  protect,
  requireAdmin,
  requireAuth
};
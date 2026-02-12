const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT Token
exports.authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;  // No user logged in
      return next();    // Continue to the route
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        req.user = null;  // Invalid token
        return next();    // Continue to the route
      }

      const user = await User.findById(decoded.id);
      if (!user || user.accountStatus === 'suspended') {
        req.user = null;
        return next();
      }

      req.user = user;  // User is logged in
      next();
    });
  } catch (error) {
    req.user = null;
    next();
  }
};

// Authorize specific roles
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Optional authentication (doesn't fail if no token)
exports.optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
        if (!err) {
          req.user = await User.findById(decoded.id);
        }
        next();
      });
    } else {
      next();
    }
  } catch (error) {
    next();
  }
};

// Generate JWT Token
exports.generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Generate Refresh Token
exports.generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE
  });
};
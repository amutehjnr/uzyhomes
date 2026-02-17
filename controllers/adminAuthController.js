const Admin = require('../models/Admin');
const { generateToken, generateRefreshToken } = require('../middleware/adminAuth');
const logger = require('../config/logger');
const crypto = require('crypto');
const emailService = require('../services/emailService');

/**
 * Admin Login
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password, rememberMe } = req.body;
    
    // Check if this is an API request
    const isApiRequest = req.xhr || req.headers['content-type'] === 'application/json' || 
                         req.headers['accept'] === 'application/json';
    
    // Get IP address
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Validate input
    if (!email || !password) {
      if (isApiRequest) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }
      return res.render('admin/login', {
        title: 'Admin Login',
        error: 'Email and password are required'
      });
    }

    // Find admin by credentials
    const admin = await Admin.findByCredentials(email, password);
    
    // Update last login
    await admin.updateLastLogin(ipAddress);
    
    // Log activity
    await admin.logActivity('login', ipAddress, 'Successful login');
    
    // Generate tokens
    const token = generateToken(admin._id);
    const refreshToken = generateRefreshToken(admin._id);
    
    // Set cookie options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000 // 7 days or 1 day
    };
    
    // Set token in cookie
    res.cookie('adminToken', token, cookieOptions);
    
    logger.info(`Admin login successful: ${admin.email}`);

    // For API requests, return JSON
    if (isApiRequest) {
      return res.json({
        success: true,
        message: 'Login successful',
        admin: admin.toJSON(),
        token,
        refreshToken,
        redirectUrl: '/admin/dashboard'
      });
    }
    
    // For form submissions, redirect
    return res.redirect('/admin/dashboard');
    
  } catch (error) {
    logger.error('Admin login error:', error);
    
    // Check if this is an API request
    const isApiRequest = req.xhr || req.headers['content-type'] === 'application/json' ||
                         req.headers['accept'] === 'application/json';
    
    if (isApiRequest) {
      // Always return JSON for API requests
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid email or password'
      });
    }
    
    // For form submissions, render the login page with error
    return res.render('admin/login', {
      title: 'Admin Login',
      error: error.message || 'Invalid email or password'
    });
  }
};

/**
 * Admin Logout
 */
exports.logout = async (req, res, next) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const isApiRequest = req.xhr || req.headers['accept'] === 'application/json';
    
    // Get token from cookie or header
    const token = req.cookies?.adminToken || req.headers.authorization?.split(' ')[1];
    
    if (token) {
      try {
        // Verify token to get admin ID
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Log activity if admin exists
        const admin = await Admin.findById(decoded.id);
        if (admin) {
          await admin.logActivity('logout', ipAddress, 'User logged out');
        }
      } catch (error) {
        // Token invalid, just proceed with logout
        logger.debug('Invalid token during logout', { error: error.message });
      }
    }
    
    // Clear cookie
    res.clearCookie('adminToken');
    
    if (isApiRequest) {
      return res.json({
        success: true,
        message: 'Logout successful'
      });
    }
    
    res.redirect('/admin/login');
  } catch (error) {
    logger.error('Admin logout error:', error);
    next(error);
  }
};

/**
 * Verify Token
 */
exports.verify = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.adminToken;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Verify token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find admin by ID
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }
    
    res.json({
      success: true,
      admin: admin.toJSON()
    });
    
  } catch (error) {
    logger.error('Token verification error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(401).json({
      success: false,
      message: 'Verification failed'
    });
  }
};

/**
 * Get Current Admin
 */
exports.getMe = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.user._id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    res.json({
      success: true,
      admin: admin.toJSON()
    });
  } catch (error) {
    logger.error('Get admin error:', error);
    next(error);
  }
};

/**
 * Update Admin Profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    const admin = await Admin.findById(req.user._id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (phone) admin.phone = phone;
    
    await admin.save();
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    await admin.logActivity('profile_update', ipAddress, 'Profile information updated');
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      admin: admin.toJSON()
    });
  } catch (error) {
    logger.error('Update admin profile error:', error);
    next(error);
  }
};

/**
 * Change Password
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.user._id).select('+password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    // Verify current password
    const isMatch = await admin.comparePassword(currentPassword);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    await admin.logActivity('password_change', ipAddress, 'Password changed successfully');
    
    logger.info(`Admin password changed: ${admin.email}`);
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change admin password error:', error);
    next(error);
  }
};

/**
 * Forgot Password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const isApiRequest = req.xhr || req.headers['accept'] === 'application/json';
    
    const admin = await Admin.findOne({ email, isActive: true });
    
    if (!admin) {
      // Don't reveal if email exists
      if (isApiRequest) {
        return res.json({
          success: true,
          message: 'If that email exists, a password reset link has been sent'
        });
      }
      return res.render('admin/forgot-password', {
        title: 'Forgot Password',
        message: 'If that email exists, a password reset link has been sent'
      });
    }
    
    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    admin.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    admin.passwordResetExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    
    await admin.save();
    
    // Send email
    await emailService.sendPasswordResetEmail(admin, resetToken);
    
    logger.info(`Password reset requested for admin: ${admin.email}`);
    
    if (isApiRequest) {
      return res.json({
        success: true,
        message: 'Password reset link sent to your email'
      });
    }
    
    res.render('admin/forgot-password', {
      title: 'Forgot Password',
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    logger.error('Admin forgot password error:', error);
    next(error);
  }
};

/**
 * Reset Password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    const isApiRequest = req.xhr || req.headers['accept'] === 'application/json';
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const admin = await Admin.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
      isActive: true
    });
    
    if (!admin) {
      if (isApiRequest) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired reset token'
        });
      }
      return res.render('admin/reset-password', {
        title: 'Reset Password',
        error: 'Invalid or expired reset token',
        token
      });
    }
    
    // Update password
    admin.password = password;
    admin.passwordResetToken = undefined;
    admin.passwordResetExpires = undefined;
    await admin.save();
    
    const ipAddress = req.ip || req.connection.remoteAddress;
    await admin.logActivity('password_reset', ipAddress, 'Password reset successfully');
    
    logger.info(`Admin password reset: ${admin.email}`);
    
    if (isApiRequest) {
      return res.json({
        success: true,
        message: 'Password reset successful. You can now login with your new password.'
      });
    }
    
    res.redirect('/admin/login?reset=success');
  } catch (error) {
    logger.error('Admin reset password error:', error);
    next(error);
  }
};

/**
 * Get Activity Log
 */
exports.getActivityLog = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const admin = await Admin.findById(req.user._id);
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }
    
    const activities = admin.activityLog
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice((page - 1) * limit, page * limit);
    
    res.json({
      success: true,
      activities,
      total: admin.activityLog.length,
      page: parseInt(page),
      pages: Math.ceil(admin.activityLog.length / limit)
    });
  } catch (error) {
    logger.error('Get activity log error:', error);
    next(error);
  }
};

/**
 * Render Admin Login Page
 */
exports.renderLogin = (req, res) => {
  // If already logged in, redirect to dashboard
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', {
    title: 'Admin Login',
    error: req.query.error || null,
    message: req.query.reset === 'success' ? 'Password reset successful. Please login with your new password.' : null
  });
};

/**
 * Render Forgot Password Page
 */
exports.renderForgotPassword = (req, res) => {
  res.render('admin/forgot-password', {
    title: 'Forgot Password',
    error: null,
    message: null
  });
};

/**
 * Render Reset Password Page
 */
exports.renderResetPassword = (req, res) => {
  const { token } = req.query;
  
  if (!token) {
    return res.redirect('/admin/login');
  }
  
  res.render('admin/reset-password', {
    title: 'Reset Password',
    token,
    error: null
  });
};

module.exports = exports;
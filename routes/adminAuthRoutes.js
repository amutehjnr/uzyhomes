const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { protect, adminOnly } = require('../middleware/auth');

// API routes (should come before render routes)
router.post('/auth/login', adminAuthController.login);
router.post('/auth/logout', protect, adminOnly, adminAuthController.logout);
router.get('/auth/verify', protect, adminOnly, adminAuthController.verify);
router.get('/auth/me', protect, adminOnly, adminAuthController.getMe);
router.put('/auth/profile', protect, adminOnly, adminAuthController.updateProfile);
router.post('/auth/change-password', protect, adminOnly, adminAuthController.changePassword);
router.post('/auth/forgot-password', adminAuthController.forgotPassword);
router.post('/auth/reset-password', adminAuthController.resetPassword);
router.get('/auth/activity-log', protect, adminOnly, adminAuthController.getActivityLog);

// Page render routes
router.get('/login', adminAuthController.renderLogin);
router.get('/forgot-password', adminAuthController.renderForgotPassword);
router.get('/reset-password', adminAuthController.renderResetPassword);

module.exports = router;
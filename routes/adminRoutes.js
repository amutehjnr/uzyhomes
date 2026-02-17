const express = require('express');
const router = express.Router();

// Import controllers
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');

// Import proper authentication middleware
const { generateToken, generateRefreshToken, protect, requireAdmin } = require('../middleware/adminAuth'); // Keep this if needed elsewhere

// PUBLIC ROUTES - No authentication required
router.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login', error: null, message: null });
});

router.get('/forgot-password', (req, res) => {
  res.render('admin/forgot-password', { title: 'Forgot Password', error: null, message: null });
});

router.get('/reset-password', (req, res) => {
  const { token } = req.query;
  if (!token) return res.redirect('/admin/login');
  res.render('admin/reset-password', { title: 'Reset Password', token, error: null });
});

// API AUTH ROUTES - No authentication required (these handle auth themselves)
router.post('/auth/login', adminAuthController.login);
router.post('/auth/logout', adminAuthController.logout);
router.get('/auth/verify', adminAuthController.verify);
router.post('/auth/forgot-password', adminAuthController.forgotPassword);
router.post('/auth/reset-password', adminAuthController.resetPassword);

// PROTECTED AUTH ROUTES - Need authentication
router.get('/auth/me', protect, adminAuthController.getMe);
router.put('/auth/profile', protect, adminAuthController.updateProfile);
router.post('/auth/change-password', protect, adminAuthController.changePassword);
router.get('/auth/activity-log', protect, adminAuthController.getActivityLog);

// API ROUTES (JSON responses) - These need authentication and admin rights
router.get('/api/products', protect, requireAdmin, adminController.getProductsAPI);
router.get('/api/orders', protect, requireAdmin, adminController.getOrdersAPI);
router.get('/api/users', protect, requireAdmin, adminController.getUsersAPI);
router.get('/api/transactions', protect, requireAdmin, adminController.getTransactionsAPI);
router.get('/api/coupons', protect, requireAdmin, adminController.getCouponsAPI);
router.get('/api/dashboard/stats', protect, requireAdmin, adminController.getDashboardStats);
router.get('/api/dashboard/charts', protect, requireAdmin, adminController.getDashboardCharts);
router.get('/api/products/low-stock', protect, requireAdmin, adminController.getLowStockProducts);

// VIEW ROUTES (HTML responses) - These render pages
// All routes below require admin authentication
router.use(protect, requireAdmin);

// Dashboard
router.get('/dashboard', adminController.getDashboard);
router.get('/', (req, res) => res.redirect('/admin/dashboard'));

// Products
router.get('/products', adminController.getProducts);
router.post('/products', adminController.createProduct);
router.get('/products/:id', adminController.getProductDetails);
router.put('/products/:id', adminController.updateProduct);
router.delete('/products/:id', adminController.deleteProduct);
router.get('/products/low-stock', adminController.getLowStockProductsView || adminController.getLowStockProducts);

// Orders
router.get('/orders', adminController.getOrders);
router.get('/orders/:id', adminController.getOrderDetails);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/status', adminController.updateUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// Transactions
router.get('/transactions', adminController.getTransactions);

// Coupons
router.get('/coupons', adminController.getCoupons);
router.post('/coupons', adminController.createCoupon);
router.put('/coupons/:id', adminController.updateCoupon);
router.delete('/coupons/:id', adminController.deleteCoupon);

// Settings
router.get('/settings', adminController.getSettings);
router.put('/settings/general', adminController.updateGeneralSettings);
router.put('/settings/shipping', adminController.updateShippingSettings);
router.put('/settings/payment', adminController.updatePaymentSettings);

module.exports = router;
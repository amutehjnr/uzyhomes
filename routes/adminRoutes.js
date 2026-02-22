const express = require('express');
const router = express.Router();

// Import controllers
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const blogController = require('../controllers/blogController'); // Add this

// Import proper authentication middleware
const { generateToken, generateRefreshToken, protect, requireAdmin } = require('../middleware/adminAuth');
const upload = require('../middleware/upload'); // Add this for image uploads

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

// API AUTH ROUTES - No authentication required
router.post('/auth/login', adminAuthController.login);
router.post('/auth/logout', adminAuthController.logout);
router.get('/auth/verify', adminAuthController.verify);
router.post('/auth/forgot-password', adminAuthController.forgotPassword);
router.post('/auth/reset-password', adminAuthController.resetPassword);

// PROTECTED AUTH ROUTES
router.get('/auth/me', protect, adminAuthController.getMe);
router.put('/auth/profile', protect, adminAuthController.updateProfile);
router.post('/auth/change-password', protect, adminAuthController.changePassword);
router.get('/auth/activity-log', protect, adminAuthController.getActivityLog);

// API ROUTES (JSON responses)
router.get('/api/products', protect, requireAdmin, adminController.getProductsAPI);
router.get('/api/orders', protect, requireAdmin, adminController.getOrdersAPI);
router.get('/api/users', protect, requireAdmin, adminController.getUsersAPI);
router.get('/api/transactions', protect, requireAdmin, adminController.getTransactionsAPI);
router.get('/api/coupons', protect, requireAdmin, adminController.getCouponsAPI);
router.get('/api/dashboard/stats', protect, requireAdmin, adminController.getDashboardStats);
router.get('/api/dashboard/charts', protect, requireAdmin, adminController.getDashboardCharts);
router.get('/api/products/low-stock', protect, requireAdmin, adminController.getLowStockProducts);

// Contact Messages Routes
router.get('/contacts', protect, requireAdmin, adminController.getContactsPage);
router.get('/api/contacts', protect, requireAdmin, adminController.getContactMessages);
router.get('/api/contacts/count', protect, requireAdmin, adminController.getContactCounts);
router.get('/api/contacts/:id', protect, requireAdmin, adminController.getContactDetails);
router.put('/api/contacts/:id/status', protect, requireAdmin, adminController.updateContactStatus);
router.post('/api/contacts/:id/reply', protect, requireAdmin, adminController.replyToContact);
router.delete('/api/contacts/:id', protect, requireAdmin, adminController.deleteContact);
router.get('/contacts/export', protect, requireAdmin, adminController.exportContacts);

// Newsletter Subscribers Routes
router.get('/subscribers', protect, requireAdmin, adminController.getSubscribersPage);
router.get('/api/subscribers', protect, requireAdmin, adminController.getSubscribers);
router.get('/api/subscribers/count', protect, requireAdmin, adminController.getSubscriberCounts);
router.delete('/api/subscribers/:id', protect, requireAdmin, adminController.deleteSubscriber);
router.post('/api/subscribers/send-newsletter', protect, requireAdmin, adminController.sendNewsletter);
router.post('/api/subscribers/send-test', protect, requireAdmin, adminController.sendTestEmail);
router.get('/subscribers/export', protect, requireAdmin, adminController.exportSubscribers);

// ===== BLOG ROUTES =====

// Blog listing page
router.get('/blog', protect, requireAdmin, blogController.getBlogPosts);

// Create blog post page
router.get('/blog/new', protect, requireAdmin, blogController.newBlogPost);

// Create blog post (with image upload)
router.post('/blog', 
  protect, 
  requireAdmin,
  upload.single('featured_image'),
  blogController.createBlogPost
);

// Edit blog post page
router.get('/blog/:id/edit', protect, requireAdmin, blogController.editBlogPost);

// Update blog post
router.put('/blog/:id', 
  protect, 
  requireAdmin,
  upload.single('featured_image'),
  blogController.updateBlogPost
);

// Delete blog post
router.delete('/blog/:id', protect, requireAdmin, blogController.deleteBlogPost);

// Toggle featured status
router.post('/blog/:id/feature', protect, requireAdmin, blogController.toggleFeatured);

// Toggle publish status
router.post('/blog/:id/publish', protect, requireAdmin, blogController.togglePublish);

// Bulk actions
router.post('/blog/bulk/delete', protect, requireAdmin, blogController.bulkDelete);
router.post('/blog/bulk/publish', protect, requireAdmin, blogController.bulkPublish);

// Blog API endpoints
router.get('/api/blog', protect, requireAdmin, blogController.getBlogPostsAPI);
router.get('/api/blog/:id', protect, requireAdmin, blogController.getBlogPostAPI);
router.get('/api/blog/stats', protect, requireAdmin, blogController.getBlogStats);

// ===== END BLOG ROUTES =====

// Order routes
router.get('/orders/:id', protect, requireAdmin, adminController.getOrderDetailsAdmin);
router.get('/api/orders/:id', protect, requireAdmin, adminController.getOrderDetailsAPI);

// VIEW ROUTES (HTML responses)
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
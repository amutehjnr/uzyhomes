const express = require('express');
const router  = express.Router();

// Import controllers
const adminController     = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const blogController      = require('../controllers/blogController');

// Import updated product methods (these replace the ones in adminController)
const {
  getProducts,
  getProductsAPI,
  getProductDetails,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getLowStockProductsView,
} = require('../controllers/adminProductMethods');

// Auth middleware
const { generateToken, generateRefreshToken, protect, requireAdmin } = require('../middleware/adminAuth');

// Multer – disk storage, accepts up to 10 product images per request
const upload = require('../middleware/upload');
const productImages = upload.array('images', 10);

// ── Error handler for multer (file-size / file-type violations) ──────────────
function handleUploadError(err, req, res, next) {
  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'One or more files exceed the 5 MB limit.' });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message || 'File upload error.' });
  }
  next();
}

// ── PUBLIC ROUTES ─────────────────────────────────────────────────────────────
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

// ── AUTH API ROUTES ───────────────────────────────────────────────────────────
router.post('/auth/login',          adminAuthController.login);
router.post('/auth/logout',         adminAuthController.logout);
router.get( '/auth/verify',         adminAuthController.verify);
router.post('/auth/forgot-password',adminAuthController.forgotPassword);
router.post('/auth/reset-password', adminAuthController.resetPassword);
router.get( '/auth/me',             protect, adminAuthController.getMe);
router.put( '/auth/profile',        protect, adminAuthController.updateProfile);
router.post('/auth/change-password',protect, adminAuthController.changePassword);
router.get( '/auth/activity-log',   protect, adminAuthController.getActivityLog);

// ── DASHBOARD API ─────────────────────────────────────────────────────────────
router.get('/api/dashboard/stats',  protect, requireAdmin, adminController.getDashboardStats);
router.get('/api/dashboard/charts', protect, requireAdmin, adminController.getDashboardCharts);

// ── PRODUCT API ───────────────────────────────────────────────────────────────
router.get('/api/products',          protect, requireAdmin, getProductsAPI);
router.get('/api/products/low-stock',protect, requireAdmin, getLowStockProducts);
router.get('/api/products/:id',      protect, requireAdmin, getProductDetails);  // must come after /low-stock

// Create – multer parses multipart before the controller
router.post(
  '/products',
  protect, requireAdmin,
  (req, res, next) => productImages(req, res, err => handleUploadError(err, req, res, next)),
  createProduct,
);

// Update – same
router.put(
  '/products/:id',
  protect, requireAdmin,
  (req, res, next) => productImages(req, res, err => handleUploadError(err, req, res, next)),
  updateProduct,
);

router.delete('/products/:id', protect, requireAdmin, deleteProduct);

// ── OTHER ADMIN API ───────────────────────────────────────────────────────────
router.get('/api/orders',       protect, requireAdmin, adminController.getOrdersAPI);
router.get('/api/users',        protect, requireAdmin, adminController.getUsersAPI);
router.get('/api/transactions', protect, requireAdmin, adminController.getTransactionsAPI);
router.get('/api/coupons',      protect, requireAdmin, adminController.getCouponsAPI);

// Contact Messages
router.get('/contacts',              protect, requireAdmin, adminController.getContactsPage);
router.get('/api/contacts',          protect, requireAdmin, adminController.getContactMessages);
router.get('/api/contacts/count',    protect, requireAdmin, adminController.getContactCounts);
router.get('/api/contacts/:id',      protect, requireAdmin, adminController.getContactDetails);
router.put('/api/contacts/:id/status',protect, requireAdmin, adminController.updateContactStatus);
router.post('/api/contacts/:id/reply',protect, requireAdmin, adminController.replyToContact);
router.delete('/api/contacts/:id',   protect, requireAdmin, adminController.deleteContact);
router.get('/contacts/export',       protect, requireAdmin, adminController.exportContacts);

// Newsletter Subscribers
router.get('/subscribers',                    protect, requireAdmin, adminController.getSubscribersPage);
router.get('/api/subscribers',                protect, requireAdmin, adminController.getSubscribers);
router.get('/api/subscribers/count',          protect, requireAdmin, adminController.getSubscriberCounts);
router.delete('/api/subscribers/:id',         protect, requireAdmin, adminController.deleteSubscriber);
router.post('/api/subscribers/send-newsletter',protect, requireAdmin, adminController.sendNewsletter);
router.post('/api/subscribers/send-test',     protect, requireAdmin, adminController.sendTestEmail);
router.get('/subscribers/export',             protect, requireAdmin, adminController.exportSubscribers);

// ── BLOG ROUTES ───────────────────────────────────────────────────────────────
const blogUpload = upload.single('featured_image');

router.get( '/blog',           protect, requireAdmin, blogController.getBlogPosts);
router.get( '/blog/new',       protect, requireAdmin, blogController.newBlogPost);
router.post('/blog',           protect, requireAdmin,
  (req, res, next) => blogUpload(req, res, err => handleUploadError(err, req, res, next)),
  blogController.createBlogPost,
);
router.get( '/blog/:id/edit',  protect, requireAdmin, blogController.editBlogPost);
router.put( '/blog/:id',       protect, requireAdmin,
  (req, res, next) => blogUpload(req, res, err => handleUploadError(err, req, res, next)),
  blogController.updateBlogPost,
);
router.delete('/blog/:id',               protect, requireAdmin, blogController.deleteBlogPost);
router.post(  '/blog/:id/feature',       protect, requireAdmin, blogController.toggleFeatured);
router.post(  '/blog/:id/publish',       protect, requireAdmin, blogController.togglePublish);
router.post(  '/blog/bulk/delete',       protect, requireAdmin, blogController.bulkDelete);
router.post(  '/blog/bulk/publish',      protect, requireAdmin, blogController.bulkPublish);
router.get(   '/api/blog',               protect, requireAdmin, blogController.getBlogPostsAPI);
router.get(   '/api/blog/stats',         protect, requireAdmin, blogController.getBlogStats);
router.get(   '/api/blog/:id',           protect, requireAdmin, blogController.getBlogPostAPI);

// ── ORDER ROUTES ──────────────────────────────────────────────────────────────
router.get('/orders/:id',        protect, requireAdmin, adminController.getOrderDetailsAdmin);
router.get('/api/orders/:id',    protect, requireAdmin, adminController.getOrderDetailsAPI);

// ── PROTECTED VIEW ROUTES (must come after specific routes) ───────────────────
router.use(protect, requireAdmin);

router.get('/', (req, res) => res.redirect('/admin/dashboard'));
router.get('/dashboard', adminController.getDashboard);

// Products (view pages)
router.get('/products',           getProducts);
router.get('/products/low-stock', getLowStockProductsView);

// Orders
router.get('/orders',            adminController.getOrders);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// Users
router.get('/users',              adminController.getUsers);
router.put('/users/:id/status',   adminController.updateUserStatus);
router.delete('/users/:id',       adminController.deleteUser);

// Transactions
router.get('/transactions', adminController.getTransactions);

// Coupons
router.get('/coupons',          adminController.getCoupons);
router.post('/coupons',         adminController.createCoupon);
router.put('/coupons/:id',      adminController.updateCoupon);
router.delete('/coupons/:id',   adminController.deleteCoupon);

// Settings
router.get('/settings',                  adminController.getSettings);
router.put('/settings/general',          adminController.updateGeneralSettings);
router.put('/settings/shipping',         adminController.updateShippingSettings);
router.put('/settings/payment',          adminController.updatePaymentSettings);

module.exports = router;
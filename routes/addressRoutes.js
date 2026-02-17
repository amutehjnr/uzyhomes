// Import controllers
const wishlistController = require('./controllers/wishlistController');
const orderController = require('./controllers/orderController');
const paymentController = require('./controllers/paymentController');
const authController = require('./controllers/authController');
const addressController = require('./controllers/addressController');

// Add these routes after your existing routes
// Address routes (simplified)
app.get('/api/addresses', authenticateToken, addressController.getAddresses);
app.put('/api/addresses', authenticateToken, addressController.updateAddress);
app.delete('/api/addresses', authenticateToken, addressController.deleteAddress);

// Wishlist routes
app.get('/api/wishlist', authenticateToken, wishlistController.getWishlist);
app.post('/api/wishlist', authenticateToken, wishlistController.addToWishlist);
app.delete('/api/wishlist/:itemId', authenticateToken, wishlistController.removeFromWishlist);
app.delete('/api/wishlist', authenticateToken, wishlistController.clearWishlist);

// Orders routes for users
app.get('/api/orders', authenticateToken, orderController.getUserOrders);
app.get('/api/orders/:id', authenticateToken, orderController.getOrderDetails);

// Payments routes for users
app.get('/api/payments', authenticateToken, paymentController.getUserPayments);
app.get('/api/payments/:id', authenticateToken, paymentController.getPaymentDetails);

// Auth routes for profile
app.get('/api/auth/me', authenticateToken, authController.getMe);
app.put('/api/auth/profile', authenticateToken, authController.updateProfile);
app.post('/api/auth/change-password', authenticateToken, authController.changePassword);
// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

// Cart routes - accessible to both guests and logged-in users
router.get('/', cartController.getCart);
router.post('/items', cartController.addToCart);
router.put('/items/:itemId', cartController.updateCartItem);
router.delete('/items/:itemId', cartController.removeFromCart);
router.post('/coupon', cartController.applyCoupon);
router.delete('/coupon', cartController.removeCoupon);
router.delete('/clear', cartController.clearCart);
router.get('/count', cartController.getCartCount);
router.post('/sync', cartController.syncCart);

// Checkout routes - REQUIRE AUTHENTICATION
router.get('/checkout', (req, res, next) => {
  if (!req.user) {
    console.log('❌ Unauthenticated user trying to access checkout');
    return res.redirect('/login?redirect=/cart/checkout');
  }
  next();
}, cartController.getCheckout);

router.post('/checkout/process', (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'You must be logged in to place an order' 
    });
  }
  next();
}, cartController.processCheckout);

router.get('/checkout/confirmation', authenticateToken, cartController.getConfirmation);

// Admin only routes
router.get('/admin/all', 
  authenticateToken, 
  authorize('admin'), 
  cartController.getAllCarts
);

module.exports = router;
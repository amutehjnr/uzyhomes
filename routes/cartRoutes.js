// routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Apply authentication - doesn't block, just sets req.user
router.use(authenticateToken);

// Cart routes - all accessible to both guests and logged-in users
router.get('/', cartController.getCart);                    // View cart
router.post('/items', cartController.addToCart);           // Add item
router.put('/items/:itemId', cartController.updateCartItem); // Update quantity
router.delete('/items/:itemId', cartController.removeFromCart); // Remove item
router.post('/coupon', cartController.applyCoupon);        // Apply coupon
router.delete('/coupon', cartController.removeCoupon);     // Remove coupon
router.delete('/clear', cartController.clearCart);         // Clear cart
router.get('/count', cartController.getCartCount);         // Get cart count
router.post('/sync', cartController.syncCart);             // Sync guest cart after login

// Checkout routes
router.get('/checkout', cartController.getCheckout);       // Checkout page
router.post('/checkout/process', cartController.processCheckout); // Process order
router.get('/checkout/confirmation', cartController.getConfirmation); // Order confirmation

// Admin only routes (if needed)
router.get('/admin/all', 
  authenticateToken, 
  authorize('admin'), 
  cartController.getAllCarts
);

module.exports = router;
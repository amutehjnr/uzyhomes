// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Public webhook endpoint (no auth required)
router.post('/webhook', paymentController.handleWebhook);

// Protected routes (require authentication)
router.use(authenticateToken);

// Payment initialization
router.post('/initialize', paymentController.initializePayment);
router.get('/', authenticateToken, paymentController.getUserPayments);
// Payment history and details
router.get('/history', paymentController.getPaymentHistory);
router.get('/user', paymentController.getUserPayments); // New route for user payments
router.get('/:id', paymentController.getPaymentDetails);

// Retry payment
router.post('/retry/:orderId', paymentController.retryPayment);

// Admin routes
router.get('/admin/all', 
  authorize('admin'), 
  paymentController.getPaymentHistory
);

module.exports = router;
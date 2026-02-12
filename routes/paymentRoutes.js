const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken, authorize } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', paymentController.getPaymentHistory);
router.get('/:id', paymentController.getPaymentDetails);
router.post('/retry/:orderId', paymentController.retryPayment);

module.exports = router;
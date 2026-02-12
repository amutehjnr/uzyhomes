const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticateToken } = require('../middleware/auth');
const { validateOrder, handleValidationErrors } = require('../middleware/validation');

router.post('/', authenticateToken, validateOrder, handleValidationErrors, orderController.createOrder);
router.get('/', authenticateToken, orderController.getOrders);
router.get('/:id', authenticateToken, orderController.getOrderById);
router.put('/:id/status', authenticateToken, orderController.updateOrderStatus);
router.put('/:id/cancel', authenticateToken, orderController.cancelOrder);

module.exports = router;
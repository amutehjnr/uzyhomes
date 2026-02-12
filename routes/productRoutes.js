const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticateToken, authorize } = require('../middleware/auth');
const { validateProduct, handleValidationErrors } = require('../middleware/validation');

router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);

router.post('/', authenticateToken, authorize('admin', 'vendor'), validateProduct, handleValidationErrors, productController.createProduct);
router.put('/:id', authenticateToken, authorize('admin', 'vendor'), productController.updateProduct);
router.delete('/:id', authenticateToken, authorize('admin', 'vendor'), productController.deleteProduct);

router.post('/:id/reviews', authenticateToken, productController.addReview);

module.exports = router;
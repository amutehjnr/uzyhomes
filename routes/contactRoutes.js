const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { authenticateToken, authorize } = require('../middleware/auth');

// Public routes
router.post('/submit', contactController.submitContact);
router.post('/newsletter/subscribe', contactController.subscribeNewsletter);
router.get('/newsletter/unsubscribe', contactController.unsubscribeNewsletter);

// Admin routes
router.get('/admin/messages', 
  authenticateToken, 
  authorize('admin'), 
  contactController.getContactMessages
);

router.put('/admin/messages/:id', 
  authenticateToken, 
  authorize('admin'), 
  contactController.updateMessageStatus
);

router.get('/admin/subscribers', 
  authenticateToken, 
  authorize('admin'), 
  contactController.getSubscribers
);

module.exports = router;
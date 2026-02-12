const express = require('express');
const router = express.Router();
const paystackWebhook = require('../webhooks/paystackWebhook');

// Middleware to capture raw body for signature verification
router.use((req, res, next) => {
  let data = '';
  req.on('data', chunk => {
    data += chunk;
  });
  req.on('end', () => {
    req.rawBody = data;
    next();
  });
});

// Paystack webhook
router.post('/paystack', express.json(), paystackWebhook.handleWebhook);

module.exports = router;
// routes/searchRoutes.js
const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');

// Full search
router.get('/', searchController.search);

// Quick/autocomplete search
router.get('/quick', searchController.quickSearch);

module.exports = router;
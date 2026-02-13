// routes/pageRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Product detail page
router.get('/product/:id', async (req, res, next) => {
  try {
    // Check if DB is connected
    if (mongoose.connection.readyState !== 1) {
      console.error('MongoDB not connected. State:', mongoose.connection.readyState);
      return res.status(503).render('error', {
        message: 'Service temporarily unavailable. Please try again.',
        user: req.user || null
      });
    }

    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).render('404', {
        message: 'Product not found',
        user: req.user || null
      });
    }

    const product = await Product.findById(req.params.id)
      .populate({
        path: 'reviews',
        populate: {
          path: 'customer',
          select: 'firstName lastName avatar'
        }
      })
      .maxTimeMS(5000); // 5 second timeout

    if (!product) {
      return res.status(404).render('404', { 
        message: 'Product not found',
        user: req.user || null 
      });
    }

    // Get related products
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true
    })
    .limit(4)
    .select('name price discountPrice images rating')
    .maxTimeMS(5000);

    res.render('product-detail', {
      title: `${product.name} — UZYHOMES`,
      product,
      relatedProducts,
      user: req.user || null,
      isGuest: !req.user
    });

  } catch (error) {
    console.error('Product page error:', error.message);
    
    if (error.name === 'MongooseError' || error.message.includes('timeout')) {
      return res.status(503).render('error', {
        message: 'Database connection timeout. Please refresh the page.',
        user: req.user || null
      });
    }
    
    next(error);
  }
});

module.exports = router;
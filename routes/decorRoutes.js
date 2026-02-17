// routes/decorRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Helper functions
const getCategoryName = (category) => {
  const categories = {
    'vases': 'Vases & Vessels',
    'candles': 'Candles & Diffusers',
    'art': 'Art & Wall Decor',
    'textiles': 'Textiles & Throws',
    'lighting': 'Lighting',
    'mirrors': 'Mirrors',
    'trays': 'Trays & Bowls',
    'books': 'Books & Objects'
  };
  return categories[category] || 'All Decor';
};

const getCategoryDescription = (category) => {
  const descriptions = {
    'vases': 'Hand-thrown ceramics with organic shapes and subtle textures. Each piece is unique.',
    'candles': 'Create atmosphere with our curated collection of calming scents and beautiful vessels.',
    'art': 'Limited edition prints from emerging artists. Each tells a story of calm and beauty.',
    'textiles': 'Luxurious throws, cushions, and textiles that add warmth and texture to your space.',
    'lighting': 'Ambient lighting that transforms the mood of any room with soft, warm illumination.',
    'mirrors': 'Beautiful mirrors that expand space and reflect light throughout your home.',
    'trays': 'Elegant trays and bowls for thoughtful organization and display.',
    'books': 'Curated books and objets that add character and interest to shelves and surfaces.'
  };
  return descriptions[category] || 'Discover our curated collection of thoughtful decor pieces.';
};

// Main decor page route
router.get('/', async (req, res, next) => {
  try {
    // Check DB connection
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).render('error', {
        message: 'Service temporarily unavailable. Please try again.',
        user: req.user || null
      });
    }

    const { category, sort = 'featured', page = 1 } = req.query;
    const limit = 12;
    const skip = (parseInt(page) - 1) * limit;

    // Build filter
    let filter = { category: 'decor', isActive: true };
    if (category && category !== 'all') {
      filter.subcategory = category;
    }

    // Build sort options
    let sortOptions = {};
    switch(sort) {
      case 'price_low':
        sortOptions = { price: 1 };
        break;
      case 'price_high':
        sortOptions = { price: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'rating':
        sortOptions = { rating: -1 };
        break;
      default:
        sortOptions = { isFeatured: -1, createdAt: -1 };
    }

    // Get products
    const products = await Product.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .maxTimeMS(5000);

    // Get total count
    const totalProducts = await Product.countDocuments(filter);
    const totalPages = Math.ceil(totalProducts / limit);

    // Get category counts for the categories section
    const categories = [
      { slug: 'vases', name: 'Vases & Vessels', icon: 'fa-wine-bottle', count: await Product.countDocuments({ category: 'decor', subcategory: 'vases', isActive: true }) },
      { slug: 'candles', name: 'Candles & Diffusers', icon: 'fa-fire', count: await Product.countDocuments({ category: 'decor', subcategory: 'candles', isActive: true }) },
      { slug: 'art', name: 'Art & Wall Decor', icon: 'fa-palette', count: await Product.countDocuments({ category: 'decor', subcategory: 'art', isActive: true }) },
      { slug: 'textiles', name: 'Textiles & Throws', icon: 'fa-th-large', count: await Product.countDocuments({ category: 'decor', subcategory: 'textiles', isActive: true }) },
      { slug: 'lighting', name: 'Lighting', icon: 'fa-lightbulb', count: await Product.countDocuments({ category: 'decor', subcategory: 'lighting', isActive: true }) },
      { slug: 'mirrors', name: 'Mirrors', icon: 'fa-expand-alt', count: await Product.countDocuments({ category: 'decor', subcategory: 'mirrors', isActive: true }) },
      { slug: 'trays', name: 'Trays & Bowls', icon: 'fa-tv', count: await Product.countDocuments({ category: 'decor', subcategory: 'trays', isActive: true }) },
      { slug: 'books', name: 'Books & Objects', icon: 'fa-book-open', count: await Product.countDocuments({ category: 'decor', subcategory: 'books', isActive: true }) }
    ];

    // Get featured products for "You May Also Love" section
    const featuredProducts = await Product.find({ category: 'decor', isFeatured: true, isActive: true })
      .limit(4)
      .sort({ rating: -1 })
      .select('name price discountPrice images rating')
      .maxTimeMS(5000);

    // Get products for specific sections
    const vaseProducts = await Product.find({ category: 'decor', subcategory: 'vases', isActive: true })
      .limit(3)
      .sort({ isFeatured: -1, createdAt: -1 });

    const candleProducts = await Product.find({ category: 'decor', subcategory: 'candles', isActive: true })
      .limit(4)
      .sort({ isFeatured: -1, createdAt: -1 });

    const artProducts = await Product.find({ category: 'decor', subcategory: 'art', isActive: true })
      .limit(3)
      .sort({ isFeatured: -1, createdAt: -1 });

    // Styling tips (static content from your HTML)
    const stylingTips = [
      {
        number: '01',
        title: 'Create Vignettes',
        description: 'Group items in threes at varying heights for visual interest. Mix textures like ceramic, wood, and metal.'
      },
      {
        number: '02',
        title: 'Embrace Negative Space',
        description: 'Allow each piece room to breathe. Clutter distracts from the beauty of individual items.'
      },
      {
        number: '03',
        title: 'Layer Lighting',
        description: 'Combine ambient, task, and accent lighting. Use dimmers to adjust mood throughout the day.'
      },
      {
        number: '04',
        title: 'Incorporate Nature',
        description: 'Add fresh or dried botanicals. Even a single stem in a beautiful vase brings life to a space.'
      },
      {
        number: '05',
        title: 'Mix Old & New',
        description: 'Combine contemporary pieces with vintage finds for depth and character.'
      },
      {
        number: '06',
        title: 'Edit Regularly',
        description: 'Rotate décor seasonally. If something no longer brings joy, let it go. Less is always more.'
      }
    ];

    res.render('decor', {
      title: category ? `${getCategoryName(category)} — UZYHOMES` : 'Décor Collections — UZYHOMES',
      products,
      featuredProducts,
      vaseProducts,
      candleProducts,
      artProducts,
      categories,
      stylingTips,
      filters: {
        category: category || 'all',
        sort
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalProducts
      },
      getCategoryName,
      getCategoryDescription,
      user: req.user || null,
      isGuest: !req.user
    });

  } catch (error) {
    console.error('Decor page error:', error.message);
    
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
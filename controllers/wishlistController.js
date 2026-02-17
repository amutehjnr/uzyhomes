// controllers/wishlistController.js
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * Get user's wishlist
 */
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate('items.product', 'name price images stock');

    if (!wishlist) {
      wishlist = { items: [] };
    }

    res.json({
      success: true,
      items: wishlist.items || []
    });
  } catch (error) {
    logger.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load wishlist'
    });
  }
};

/**
 * Add item to wishlist
 */
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.body;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        items: []
      });
    }

    // Check if product already in wishlist
    const existingItem = wishlist.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist'
      });
    }

    // Add to wishlist
    wishlist.items.push({ product: productId });
    await wishlist.save();

    res.json({
      success: true,
      message: 'Added to wishlist',
      wishlist
    });
  } catch (error) {
    logger.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to add to wishlist'
    });
  }
};

/**
 * Remove item from wishlist
 */
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist not found'
      });
    }

    // Remove item
    wishlist.items = wishlist.items.filter(
      item => item._id.toString() !== itemId
    );

    await wishlist.save();

    res.json({
      success: true,
      message: 'Removed from wishlist'
    });
  } catch (error) {
    logger.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
};

/**
 * Clear wishlist
 */
exports.clearWishlist = async (req, res, next) => {
  try {
    await Wishlist.findOneAndUpdate(
      { user: req.user._id },
      { items: [] }
    );

    res.json({
      success: true,
      message: 'Wishlist cleared'
    });
  } catch (error) {
    logger.error('Clear wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear wishlist'
    });
  }
};
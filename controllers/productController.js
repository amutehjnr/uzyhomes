const Product = require('../models/Product');
const Review = require('../models/Review');
const logger = require('../config/logger'); // Add this if you have logger

exports.getAllProducts = async (req, res, next) => {
  try {
    const { category, minPrice, maxPrice, search, sort, page = 1, limit = 12 } = req.query;

    let filter = { isActive: true };

    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }
    if (search) {
      filter.$text = { $search: search };
    }

    let query = Product.find(filter).populate('vendor', 'firstName lastName email');

    // Sorting
    if (sort === 'price_asc') query = query.sort({ price: 1 });
    else if (sort === 'price_desc') query = query.sort({ price: -1 });
    else if (sort === 'newest') query = query.sort({ createdAt: -1 });
    else if (sort === 'rating') query = query.sort({ rating: -1 });
    else query = query.sort({ createdAt: -1 });

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    const products = await query.skip(skip).limit(parseInt(limit));

    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'firstName lastName email')
      .populate({
        path: 'reviews',
        populate: {
          path: 'customer',
          select: 'firstName lastName avatar'
        }
      });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, category, price, stock, sku, specifications } = req.body;

    const product = new Product({
      name,
      description,
      category,
      price,
      stock,
      sku,
      specifications,
      vendor: req.user._id
    });

    await product.save();
    res.status(201).json({ message: 'Product created successfully', product });
  } catch (error) {
    next(error);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this product' });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    next(error);
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this product' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.addReview = async (req, res, next) => {
  try {
    const { rating, title, comment, images } = req.body;
    const productId = req.params.id;

    const review = new Review({
      product: productId,
      customer: req.user._id,
      rating,
      title,
      comment,
      images,
      verified: true
    });

    await review.save();

    // Update product rating
    const allReviews = await Review.find({ product: productId });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await Product.findByIdAndUpdate(productId, {
      rating: avgRating,
      reviewCount: allReviews.length
    });

    res.status(201).json({ message: 'Review added successfully', review });
  } catch (error) {
    next(error);
  }
};

// UPDATED METHODS FOR CATEGORY PAGES WITH COUNTS
exports.getBeddingPage = async (req, res, next) => {
    try {
        const products = await Product.find({ 
            category: 'bedding', 
            isActive: true 
        }).sort({ createdAt: -1 });

        // Get counts for each bedding subcategory
        const sheetsCount = await Product.countDocuments({ category: 'bedding', subcategory: 'sheets', isActive: true });
        const duvetCount = await Product.countDocuments({ category: 'bedding', subcategory: 'duvet', isActive: true });
        const pillowsCount = await Product.countDocuments({ category: 'bedding', subcategory: 'pillows', isActive: true });
        const towelsCount = await Product.countDocuments({ category: 'bedding', subcategory: 'towels', isActive: true });
        const throwsCount = await Product.countDocuments({ category: 'bedding', subcategory: 'throws', isActive: true });
        const robesCount = await Product.countDocuments({ category: 'bedding', subcategory: 'robes', isActive: true });

        res.render('bedding', {
            title: 'Bedding Collection | UZYHOMES',
            products,
            sheetsCount,
            duvetCount,
            pillowsCount,
            towelsCount,
            throwsCount,
            robesCount,
            user: req.user || null
        });
    } catch (error) {
        logger.error('Bedding page error:', error);
        next(error);
    }
};

exports.getDecorPage = async (req, res, next) => {
    try {
        const products = await Product.find({ 
            category: { 
                $in: ['decor', 'wall artwork', 'vases', 'bowls and trays', 'books and objects', 'accessories'] 
            }, 
            isActive: true 
        }).sort({ createdAt: -1 });

        // Get counts for each decor category
        const wallArtCount = await Product.countDocuments({ category: 'wall artwork', isActive: true });
        const vasesCount = await Product.countDocuments({ category: 'vases', isActive: true });
        const bowlsTraysCount = await Product.countDocuments({ category: 'bowls and trays', isActive: true });
        const booksObjectsCount = await Product.countDocuments({ category: 'books and objects', isActive: true });
        const accessoriesCount = await Product.countDocuments({ category: 'accessories', isActive: true });

        res.render('decor', {
            title: 'Decor Collection | UZYHOMES',
            products,
            wallArtCount,
            vasesCount,
            bowlsTraysCount,
            booksObjectsCount,
            accessoriesCount,
            user: req.user || null
        });
    } catch (error) {
        logger.error('Decor page error:', error);
        next(error);
    }
};

exports.getFurniturePage = async (req, res, next) => {
    try {
        const { sort = 'featured', category = 'all', page = 1, limit = 12 } = req.query;
        
        const currentPage = parseInt(page);
        const perPage = parseInt(limit);
        const skip = (currentPage - 1) * perPage;
        
        let filter = { category: 'furniture', isActive: true };
        
        if (category && category !== 'all') {
            filter.subcategory = category;
        }
        
        const sortMap = {
            featured: { isFeatured: -1, createdAt: -1 },
            newest: { createdAt: -1 },
            price_low: { price: 1 },
            price_high: { price: -1 }
        };
        
        const [products, total] = await Promise.all([
            Product.find(filter).sort(sortMap[sort] || sortMap.featured).skip(skip).limit(perPage),
            Product.countDocuments(filter)
        ]);

        // Get counts for each furniture subcategory
        const sofasCount = await Product.countDocuments({ category: 'furniture', subcategory: 'sofas', isActive: true });
        const armchairsCount = await Product.countDocuments({ category: 'furniture', subcategory: 'armchairs', isActive: true });
        const coffeeTablesCount = await Product.countDocuments({ category: 'furniture', subcategory: 'coffee tables', isActive: true });
        const sideboardsCount = await Product.countDocuments({ category: 'furniture', subcategory: 'sideboards', isActive: true });
        const bookshelvesCount = await Product.countDocuments({ category: 'furniture', subcategory: 'bookshelves', isActive: true });
        
        res.render('furniture', {
            title: 'Furniture Collection | UZYHOMES',
            products,
            sofasCount,
            armchairsCount,
            coffeeTablesCount,
            sideboardsCount,
            bookshelvesCount,
            pagination: {
                currentPage,
                totalPages: Math.ceil(total / perPage),
                hasNext: currentPage < Math.ceil(total / perPage),
                hasPrev: currentPage > 1,
                nextPage: currentPage + 1,
                prevPage: currentPage - 1
            },
            filters: { sort, category },
            user: req.user || null
        });
    } catch (error) {
        logger.error('Furniture page error:', error);
        next(error);
    }
};
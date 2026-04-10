// ======================================================
// PRODUCTS METHODS  (drop-in replacement for the product
// section inside controllers/adminController.js)
// ======================================================
// Replace the existing createProduct, updateProduct, and
// deleteProduct exports with these versions.
// ──────────────────────────────────────────────────────
// These functions handle:
//   • multipart/form-data (when images are uploaded)
//   • plain JSON (when no new images are sent)
//   • removal of old images by publicId or by URL-based
//     filename (for disk storage)
// ──────────────────────────────────────────────────────

const fs   = require('fs');
const path = require('path');

/**
 * Helper – delete a local file from public/uploads
 */
function deleteLocalFile(urlOrPublicId) {
  if (!urlOrPublicId) return;
  try {
    // If it looks like a full URL starting with /uploads/...
    let filePath = urlOrPublicId;
    if (filePath.startsWith('/')) {
      filePath = path.join(process.cwd(), 'public', filePath);
    } else if (!path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), 'public/uploads/products', filePath);
    }
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (e) {
    console.warn('Could not delete file:', urlOrPublicId, e.message);
  }
}

/**
 * Build an images array from multer req.files
 */
function buildImagesFromFiles(files) {
  if (!files || !files.length) return [];
  return files.map(f => ({
    url:      `/uploads/products/${f.filename}`,
    publicId: f.filename,          // use filename as the "public id" for disk storage
  }));
}

/**
 * Products Management - Render Page
 */
exports.getProducts = async (req, res, next) => {
  const Product = require('../models/Product');
  const Order   = require('../models/Order');
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    let filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku:  { $regex: search, $options: 'i' } },
    ];
    if (category) filter.category = category;
    if (status)   filter.isActive = status === 'active';

    const skip  = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProducts    = await Product.countDocuments();
    const activeProducts   = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10, $gt: 0 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    res.render('admin/products', {
      title: 'Products Management',
      user: req.user,
      products,
      currentPage: 'products',
      page: 'products',
      stats: { total: totalProducts, active: activeProducts, lowStock: lowStockProducts, outOfStock: outOfStockProducts },
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1, to: Math.min(skip + parseInt(limit), total),
      },
      filters: { search, category, status },
    });
  } catch (error) {
    require('../config/logger').error('Get products error:', error);
    next(error);
  }
};

/**
 * Products API - Returns JSON for AJAX requests
 */
exports.getProductsAPI = async (req, res, next) => {
  const Product = require('../models/Product');
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;
    let filter = {};
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { sku:  { $regex: search, $options: 'i' } },
    ];
    if (category) filter.category = category;
    if (status)   filter.isActive = status === 'active';

    const skip  = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true, products,
      pagination: {
        total, page: parseInt(page), limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1, to: Math.min(skip + parseInt(limit), total),
      },
    });
  } catch (error) {
    require('../config/logger').error('Get products API error:', error);
    res.status(500).json({ success: false, message: 'Failed to load products' });
  }
};

/**
 * Get Product Details (API)
 */
exports.getProductDetails = async (req, res, next) => {
  const Product = require('../models/Product');
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'firstName lastName email');
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (error) {
    require('../config/logger').error('Get product details error:', error);
    res.status(500).json({ success: false, message: 'Failed to load product details' });
  }
};

/**
 * Create Product (API) – handles both JSON and multipart
 */
exports.createProduct = async (req, res, next) => {
  const Product = require('../models/Product');
  const logger  = require('../config/logger');
  try {
    let {
      name, description, category, subcategory,
      price, discountPrice, stock, sku,
      specifications, isFeatured, isActive,
    } = req.body;

    // Parse JSON strings sent from FormData
    if (typeof specifications === 'string') {
      try { specifications = JSON.parse(specifications); } catch { specifications = {}; }
    }

    // Build spec object from flat fields if top-level spec fields were sent
    if (!specifications || !Object.keys(specifications).length) {
      specifications = {
        material: req.body.specMaterial || undefined,
        color:    req.body.specColor    || undefined,
        size:     req.body.specSize     || undefined,
        care:     req.body.specCare     || undefined,
      };
      // Remove undefined keys
      Object.keys(specifications).forEach(k => specifications[k] === undefined && delete specifications[k]);
    }

    // Check duplicate SKU
    const existing = await Product.findOne({ sku });
    if (existing) {
      // Clean up any uploaded files before returning error
      if (req.files) req.files.forEach(f => deleteLocalFile(f.path));
      return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
    }

    // Build images array from uploaded files
    const newImages = buildImagesFromFiles(req.files);

    // Also accept images sent as JSON array (for non-file workflows)
    let jsonImages = [];
    if (req.body.images) {
      try { jsonImages = JSON.parse(req.body.images); } catch { jsonImages = []; }
    }

    const images = [...newImages, ...jsonImages];

    const product = new Product({
      name,
      description,
      category,
      subcategory:   subcategory   || undefined,
      price:         parseFloat(price),
      discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
      stock:         parseInt(stock)  || 0,
      sku,
      specifications,
      images,
      vendor:     req.user._id,
      isActive:   isActive === 'false' ? false : true,
      isFeatured: isFeatured === 'true' || isFeatured === true,
    });

    await product.save();
    logger.info(`Product created: ${name} by ${req.user.email}`);

    res.json({ success: true, message: 'Product created successfully', product });
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    require('../config/logger').error('Create product error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to create product' });
  }
};

/**
 * Update Product (API) – handles both JSON and multipart
 */
exports.updateProduct = async (req, res, next) => {
  const Product = require('../models/Product');
  const logger  = require('../config/logger');
  try {
    const { id } = req.params;

    let {
      name, description, category, subcategory,
      price, discountPrice, stock, sku,
      specifications, isFeatured, isActive,
      removeImages,   // JSON array of publicIds / filenames to remove
    } = req.body;

    // Parse JSON strings
    if (typeof specifications === 'string') {
      try { specifications = JSON.parse(specifications); } catch { specifications = {}; }
    }
    if (typeof removeImages === 'string') {
      try { removeImages = JSON.parse(removeImages); } catch { removeImages = []; }
    }
    removeImages = removeImages || [];

    // Build spec object from flat fields if needed
    if (!specifications || !Object.keys(specifications).length) {
      specifications = {
        material: req.body.specMaterial || undefined,
        color:    req.body.specColor    || undefined,
        size:     req.body.specSize     || undefined,
        care:     req.body.specCare     || undefined,
      };
      Object.keys(specifications).forEach(k => specifications[k] === undefined && delete specifications[k]);
    }

    // Check if SKU is taken by another product
    if (sku) {
      const dupe = await Product.findOne({ sku, _id: { $ne: id } });
      if (dupe) {
        if (req.files) req.files.forEach(f => deleteLocalFile(f.path));
        return res.status(400).json({ success: false, message: 'A product with this SKU already exists' });
      }
    }

    // Fetch existing product to manipulate images
    const product = await Product.findById(id);
    if (!product) {
      if (req.files) req.files.forEach(f => deleteLocalFile(f.path));
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Remove images that were flagged for deletion
    if (removeImages.length) {
      product.images = product.images.filter(img => {
        const pid = img.publicId || img.url;
        if (removeImages.includes(pid)) {
          deleteLocalFile(img.url);   // delete from disk
          return false;               // remove from array
        }
        return true;
      });
    }

    // Append newly uploaded images
    const newImages = buildImagesFromFiles(req.files);
    if (newImages.length) product.images.push(...newImages);

    // Also accept JSON image array additions
    if (req.body.images) {
      try {
        const ji = JSON.parse(req.body.images);
        if (Array.isArray(ji)) product.images.push(...ji);
      } catch {}
    }

    // Apply scalar updates
    if (name)         product.name        = name;
    if (sku)          product.sku         = sku;
    if (category)     product.category    = category;
    if (subcategory !== undefined) product.subcategory = subcategory || undefined;
    if (price)        product.price       = parseFloat(price);
    if (discountPrice !== undefined) product.discountPrice = discountPrice ? parseFloat(discountPrice) : undefined;
    if (stock  !== undefined)        product.stock        = parseInt(stock) || 0;
    if (description)  product.description = description;
    if (isActive  !== undefined) product.isActive   = isActive  === 'false' ? false : Boolean(isActive);
    if (isFeatured !== undefined) product.isFeatured = isFeatured === 'true'  || isFeatured === true;

    // Merge specifications
    if (specifications && Object.keys(specifications).length) {
      product.specifications = { ...product.specifications?.toObject?.() || {}, ...specifications };
    }

    await product.save();
    logger.info(`Product updated: ${product.name} by ${req.user.email}`);

    res.json({ success: true, message: 'Product updated successfully', product });
  } catch (error) {
    if (req.files) req.files.forEach(f => { try { fs.unlinkSync(f.path); } catch {} });
    require('../config/logger').error('Update product error:', error);
    res.status(400).json({ success: false, message: error.message || 'Failed to update product' });
  }
};

/**
 * Delete Product (API)
 */
exports.deleteProduct = async (req, res, next) => {
  const Product = require('../models/Product');
  const Order   = require('../models/Order');
  const logger  = require('../config/logger');
  try {
    const { id } = req.params;

    const orderCount = await Order.countDocuments({ 'items.product': id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a product that has been ordered. Consider deactivating it instead.',
      });
    }

    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    // Delete associated images from disk
    (product.images || []).forEach(img => deleteLocalFile(img.url));

    logger.info(`Product deleted: ${product.name} by ${req.user.email}`);
    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    require('../config/logger').error('Delete product error:', error);
    res.status(400).json({ success: false, message: 'Failed to delete product' });
  }
};

/**
 * Get Low Stock Products (API)
 */
exports.getLowStockProducts = async (req, res, next) => {
  const Product = require('../models/Product');
  try {
    const products = await Product.find({ stock: { $lt: 10 } })
      .select('name stock sku price category')
      .limit(10);
    res.json({ success: true, products });
  } catch (error) {
    require('../config/logger').error('Get low stock products error:', error);
    res.status(500).json({ success: false, message: 'Failed to load low stock products' });
  }
};

/**
 * Low Stock Products View - Renders page
 */
exports.getLowStockProductsView = async (req, res, next) => {
  const Product = require('../models/Product');
  try {
    const products = await Product.find({ stock: { $lt: 10 } })
      .select('name stock sku price category')
      .limit(10);
    res.render('admin/low-stock', {
      title: 'Low Stock Products',
      user: req.user,
      currentPage: 'products',
      products,
      page: 'low-stock',
    });
  } catch (error) {
    require('../config/logger').error('Get low stock products view error:', error);
    next(error);
  }
};
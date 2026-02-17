const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Coupon = require('../models/Coupon');
const logger = require('../config/logger');
const Contact = require('../models/Contact'); // Add this
const Subscriber = require('../models/Subscriber'); // Add 
const emailService = require('../services/emailService'); // Add this for email functionality

// ======================================================
// DASHBOARD METHODS
// ======================================================

/**
 * Admin Dashboard - Render Page
 */
exports.getDashboard = async (req, res, next) => {
  try {
    // Get statistics
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();
    
    const totalRevenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Recent orders
    const recentOrders = await Order.find()
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    // Monthly revenue (last 12 months)
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top selling products
    const topProducts = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Low stock products
    const lowStockProducts = await Product.find({ stock: { $lt: 10 } })
      .select('name stock sku')
      .limit(10);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      user: req.user,
      stats: {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue
      },
      recentOrders,
      ordersByStatus,
      monthlyRevenue,
      topProducts,
      lowStockProducts,
      page: 'dashboard'
    });
  } catch (error) {
    logger.error('Admin dashboard error:', error);
    next(error);
  }
};

/**
 * Get Dashboard Stats (API)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const totalOrders = await Order.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();
    
    const totalRevenueResult = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue
      }
    });
  } catch (error) {
    logger.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard stats'
    });
  }
};

/**
 * Get Dashboard Charts Data (API)
 */
exports.getDashboardCharts = async (req, res, next) => {
  try {
    // Monthly revenue (last 12 months)
    const monthlyRevenue = await Order.aggregate([
      {
        $match: {
          paymentStatus: 'completed',
          createdAt: { $gte: new Date(new Date().setMonth(new Date().getMonth() - 12)) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      data: {
        monthlyRevenue,
        ordersByStatus
      }
    });
  } catch (error) {
    logger.error('Get dashboard charts error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load chart data'
    });
  }
};

// ======================================================
// PRODUCTS METHODS
// ======================================================

/**
 * Products Management - Render Page
 */
exports.getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;

    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    
    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get stats for the stat cards
    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({ stock: { $lt: 10, $gt: 0 } });
    const outOfStockProducts = await Product.countDocuments({ stock: 0 });

    res.render('admin/products', {
      title: 'Products Management',
      user: req.user,
      products,
      currentPage: 'products',
      page: 'products',
      stats: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      },
      filters: { search, category, status }
    });
  } catch (error) {
    logger.error('Get products error:', error);
    next(error);
  }
};

/**
 * Products API - Returns JSON for AJAX requests
 */
exports.getProductsAPI = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, category, status } = req.query;

    let filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    if (category) filter.category = category;
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;
    const total = await Product.countDocuments(filter);
    
    const products = await Product.find(filter)
      .populate('vendor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      }
    });
  } catch (error) {
    logger.error('Get products API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load products'
    });
  }
};

/**
 * Get Product Details (API)
 */
exports.getProductDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const product = await Product.findById(id)
      .populate('vendor', 'firstName lastName email');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.json({
      success: true,
      product
    });
  } catch (error) {
    logger.error('Get product details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load product details'
    });
  }
};

/**
 * Create Product (API)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const {
      name, description, category, price, discountPrice,
      stock, sku, specifications, images
    } = req.body;

    // Check if SKU already exists
    const existingProduct = await Product.findOne({ sku });
    if (existingProduct) {
      return res.status(400).json({
        success: false,
        message: 'Product with this SKU already exists'
      });
    }

    const product = new Product({
      name,
      description,
      category,
      price,
      discountPrice: discountPrice || 0,
      stock: stock || 0,
      sku,
      specifications: specifications ? (typeof specifications === 'string' ? JSON.parse(specifications) : specifications) : {},
      images: images || [],
      vendor: req.user._id,
      isActive: true
    });

    await product.save();

    res.json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    logger.error('Create product error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create product'
    });
  }
};

/**
 * Update Product (API)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Parse JSON strings if needed
    if (updates.specifications && typeof updates.specifications === 'string') {
      updates.specifications = JSON.parse(updates.specifications);
    }
    if (updates.images && typeof updates.images === 'string') {
      updates.images = JSON.parse(updates.images);
    }

    // If SKU is being updated, check if it's already taken
    if (updates.sku) {
      const existingProduct = await Product.findOne({ 
        sku: updates.sku,
        _id: { $ne: id }
      });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Product with this SKU already exists'
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    logger.error('Update product error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
};

/**
 * Delete Product (API)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product is used in any orders
    const orderCount = await Order.countDocuments({ 'items.product': id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product that has been ordered. Consider deactivating it instead.'
      });
    }

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error('Delete product error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete product'
    });
  }
};

/**
 * Get Low Stock Products (API)
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const products = await Product.find({ stock: { $lt: 10 } })
      .select('name stock sku price category')
      .limit(10);

    res.json({
      success: true,
      products
    });
  } catch (error) {
    logger.error('Get low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load low stock products'
    });
  }
};

/**
 * Low Stock Products View - Renders page
 */
exports.getLowStockProductsView = async (req, res, next) => {
  try {
    const products = await Product.find({ stock: { $lt: 10 } })
      .select('name stock sku price category')
      .limit(10);

    res.render('admin/low-stock', {
      title: 'Low Stock Products',
      user: req.user,
      currentPage: 'products',
      products,
      page: 'low-stock'
    });
  } catch (error) {
    logger.error('Get low stock products view error:', error);
    next(error);
  }
};

// ======================================================
// ORDERS METHODS
// ======================================================

/**
 * Orders Management - Render Page
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status, paymentStatus } = req.query;

    let filter = {};
    
    // Search by order number
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const skip = (page - 1) * limit;
    const total = await Order.countDocuments(filter);
    
    const orders = await Order.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name sku price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate stats for the stat cards
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
    const processingOrders = await Order.countDocuments({ orderStatus: 'processing' });
    const shippedOrders = await Order.countDocuments({ orderStatus: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ orderStatus: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ orderStatus: 'cancelled' });

    res.render('admin/orders', {
      title: 'Orders Management',
      user: req.user,
      currentPage: 'orders',
      orders,
      stats: {
        total: totalOrders,
        pending: pendingOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      },
      filters: { search, status, paymentStatus },
      page: 'orders'
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    next(error);
  }
};

/**
 * Orders API - Returns JSON for AJAX requests
 */
exports.getOrdersAPI = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    let filter = {};
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status) filter.orderStatus = status;

    const skip = (page - 1) * limit;
    const total = await Order.countDocuments(filter);
    
    const orders = await Order.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name sku price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      }
    });
  } catch (error) {
    logger.error('Get orders API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load orders'
    });
  }
};

/**
 * Get Order Details (API)
 */
exports.getOrderDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const order = await Order.findById(id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('items.product', 'name sku images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Get order details error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to get order details'
    });
  }
};

/**
 * Update Order Status (API)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, note, trackingNumber, shippingProvider } = req.body;

    const order = await Order.findById(id)
      .populate('customer', 'firstName lastName email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.orderStatus = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (shippingProvider) order.shippingProvider = shippingProvider;

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status updated to ${status} by admin`,
      updatedBy: req.user._id
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    logger.error('Update order status error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// ======================================================
// USERS METHODS
// ======================================================

/**
 * Users Management - Render Page
 */
exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;

    let filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) filter.role = role;
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(filter);
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get order counts and totals for users
    const userIds = users.map(u => u._id);
    const orderStats = await Order.aggregate([
      { $match: { customer: { $in: userIds } } },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      }
    ]);

    const statsMap = {};
    orderStats.forEach(stat => {
      statsMap[stat._id] = {
        orderCount: stat.orderCount,
        totalSpent: stat.totalSpent
      };
    });

    const usersWithStats = users.map(user => ({
      ...user.toObject(),
      ordersCount: statsMap[user._id]?.orderCount || 0,
      totalSpent: statsMap[user._id]?.totalSpent || 0
    }));

    // Calculate stats for the stat cards
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const inactiveUsers = await User.countDocuments({ isActive: false });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().setDate(1)) }
    });

    res.render('admin/users', {
      title: 'Users Management',
      user: req.user,
      currentPage: 'users',
      users: usersWithStats,
      stats: {
        total: totalUsers,
        active: activeUsers,
        inactive: inactiveUsers,
        new: newUsersThisMonth
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      },
      filters: { search, role, status },
      page: 'users'
    });
  } catch (error) {
    logger.error('Get users error:', error);
    next(error);
  }
};

/**
 * Users API - Returns JSON for AJAX requests
 */
exports.getUsersAPI = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    let filter = {};
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;
    const total = await User.countDocuments(filter);
    
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get order counts
    const userIds = users.map(u => u._id);
    const orderStats = await Order.aggregate([
      { $match: { customer: { $in: userIds } } },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      }
    ]);

    const statsMap = {};
    orderStats.forEach(stat => {
      statsMap[stat._id] = {
        orderCount: stat.orderCount,
        totalSpent: stat.totalSpent
      };
    });

    const usersWithStats = users.map(user => ({
      ...user.toObject(),
      ordersCount: statsMap[user._id]?.orderCount || 0,
      totalSpent: statsMap[user._id]?.totalSpent || 0
    }));

    res.json({
      success: true,
      users: usersWithStats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      }
    });
  } catch (error) {
    logger.error('Get users API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load users'
    });
  }
};

/**
 * Update User Status (API)
 */
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user
    });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to update user status'
    });
  }
};

/**
 * Delete User (API)
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Don't allow deleting yourself
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Check if user has orders
    const orderCount = await Order.countDocuments({ customer: id });
    if (orderCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete user with existing orders. Consider deactivating instead.'
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

// ======================================================
// TRANSACTIONS METHODS
// ======================================================

/**
 * Transactions Management - Render Page
 */
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let filter = {};
    
    // Filter by status
    if (status) filter.status = status;
    
    // Search by transaction reference
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Payment.countDocuments(filter);
    
    const transactions = await Payment.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('order', 'orderNumber total')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate total revenue
    const totalRevenueResult = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    // Calculate transaction stats
    const successfulCount = await Payment.countDocuments({ status: 'completed' });
    const failedCount = await Payment.countDocuments({ status: 'failed' });
    const pendingCount = await Payment.countDocuments({ status: 'pending' });
    const refundedCount = await Payment.countDocuments({ status: 'refunded' });

    res.render('admin/transactions', {
      title: 'Transactions',
      user: req.user,
      currentPage: 'transactions',
      transactions,
      totalRevenue: totalRevenueResult[0]?.total || 0,
      stats: {
        successful: successfulCount,
        failed: failedCount,
        pending: pendingCount,
        refunded: refundedCount
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      },
      filters: { status, search },
      page: 'transactions'
    });
  } catch (error) {
    logger.error('Get transactions error:', error);
    next(error);
  }
};

/**
 * Transactions API - Returns JSON for AJAX requests
 */
exports.getTransactionsAPI = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    let filter = {};
    
    if (status) filter.status = status;
    
    if (search) {
      filter.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const total = await Payment.countDocuments(filter);
    
    const transactions = await Payment.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('order', 'orderNumber total')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      transactions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      }
    });
  } catch (error) {
    logger.error('Get transactions API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load transactions'
    });
  }
};

// ======================================================
// COUPONS METHODS
// ======================================================

/**
 * Coupons Management - Render Page
 */
exports.getCoupons = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    let filter = {};
    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;
    const total = await Coupon.countDocuments(filter);
    
    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate stats for stat cards
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ isActive: true });
    
    // Calculate expired coupons
    const now = new Date();
    const expiredCoupons = await Coupon.countDocuments({ 
      validUntil: { $lt: now },
      isActive: true
    });
    
    // Calculate total usage across all coupons
    const usageResult = await Coupon.aggregate([
      { $group: { _id: null, totalUsage: { $sum: '$usageCount' } } }
    ]);
    const totalUsage = usageResult[0]?.totalUsage || 0;

    res.render('admin/coupons', {
      title: 'Coupons Management',
      user: req.user,
      currentPage: 'coupons',
      coupons,
      stats: {
        total: totalCoupons,
        active: activeCoupons,
        expired: expiredCoupons,
        totalUsage: totalUsage
      },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      },
      filters: { search, status },
      page: 'coupons'
    });
  } catch (error) {
    logger.error('Get coupons error:', error);
    next(error);
  }
};

/**
 * Coupons API - Returns JSON for AJAX requests
 */
exports.getCouponsAPI = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, status } = req.query;

    let filter = {};
    if (search) {
      filter.code = { $regex: search, $options: 'i' };
    }
    if (status) filter.isActive = status === 'active';

    const skip = (page - 1) * limit;
    const total = await Coupon.countDocuments(filter);
    
    const coupons = await Coupon.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      coupons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        from: skip + 1,
        to: Math.min(skip + parseInt(limit), total)
      }
    });
  } catch (error) {
    logger.error('Get coupons API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load coupons'
    });
  }
};

/**
 * Create Coupon (API)
 */
exports.createCoupon = async (req, res, next) => {
  try {
    const {
      code, description, discountType, discountValue,
      maxDiscountAmount, minPurchaseAmount, usageLimit,
      validFrom, validUntil, categories, products
    } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      return res.status(400).json({
        success: false,
        message: 'Coupon code already exists'
      });
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      maxDiscountAmount,
      minPurchaseAmount,
      usageLimit,
      validFrom: validFrom || new Date(),
      validUntil,
      categories: categories ? (typeof categories === 'string' ? JSON.parse(categories) : categories) : [],
      products: products ? (typeof products === 'string' ? JSON.parse(products) : products) : [],
      isActive: true,
      usageCount: 0
    });

    await coupon.save();

    res.json({
      success: true,
      message: 'Coupon created successfully',
      coupon
    });
  } catch (error) {
    logger.error('Create coupon error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create coupon'
    });
  }
};

/**
 * Update Coupon (API)
 */
exports.updateCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    if (updates.code) {
      updates.code = updates.code.toUpperCase();
      
      // Check if new code is already taken
      const existingCoupon = await Coupon.findOne({ 
        code: updates.code,
        _id: { $ne: id }
      });
      if (existingCoupon) {
        return res.status(400).json({
          success: false,
          message: 'Coupon code already exists'
        });
      }
    }

    // Parse JSON strings if needed
    if (updates.categories && typeof updates.categories === 'string') {
      updates.categories = JSON.parse(updates.categories);
    }
    if (updates.products && typeof updates.products === 'string') {
      updates.products = JSON.parse(updates.products);
    }

    const coupon = await Coupon.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon updated successfully',
      coupon
    });
  } catch (error) {
    logger.error('Update coupon error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update coupon'
    });
  }
};

/**
 * Delete Coupon (API)
 */
exports.deleteCoupon = async (req, res, next) => {
  try {
    const { id } = req.params;

    const coupon = await Coupon.findByIdAndDelete(id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    logger.error('Delete coupon error:', error);
    res.status(400).json({
      success: false,
      message: 'Failed to delete coupon'
    });
  }
};

// ======================================================
// SETTINGS METHODS
// ======================================================

/**
 * Settings - Render Page
 */
exports.getSettings = async (req, res, next) => {
  try {
    res.render('admin/settings', {
      title: 'Settings',
      user: req.user,
      currentPage: 'settings',
      page: 'settings'
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    next(error);
  }
};

/**
 * Update General Settings (API)
 */
exports.updateGeneralSettings = async (req, res, next) => {
  try {
    const { siteName, siteEmail, sitePhone, siteAddress, currency, timezone } = req.body;
    
    logger.info('General settings updated by admin', { admin: req.user.email });
    
    res.json({
      success: true,
      message: 'General settings updated successfully'
    });
  } catch (error) {
    logger.error('Update general settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};

/**
 * Update Shipping Settings (API)
 */
exports.updateShippingSettings = async (req, res, next) => {
  try {
    const { freeShippingThreshold, shippingRates, defaultCarrier } = req.body;
    
    logger.info('Shipping settings updated by admin', { admin: req.user.email });
    
    res.json({
      success: true,
      message: 'Shipping settings updated successfully'
    });
  } catch (error) {
    logger.error('Update shipping settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shipping settings'
    });
  }
};

/**
 * Update Payment Settings (API)
 */
exports.updatePaymentSettings = async (req, res, next) => {
  try {
    const { paystackPublicKey, paystackSecretKey, flutterwavePublicKey, flutterwaveSecretKey } = req.body;
    
    logger.info('Payment settings updated by admin', { admin: req.user.email });
    
    res.json({
      success: true,
      message: 'Payment settings updated successfully'
    });
  } catch (error) {
    logger.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment settings'
    });
  }
};

/**
 * Admin Order Details - Render Page
 */
exports.getOrderDetailsAdmin = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name sku images price');

    if (!order) {
      return res.status(404).render('error', {
        title: 'Order Not Found',
        message: 'The order you are looking for does not exist'
      });
    }

    res.render('admin/order-details', {
      title: 'Order Details',
      user: req.user,
      order,
      currentPage: 'orders',
      page: 'order-details'
    });
  } catch (error) {
    logger.error('Get order details error:', error);
    next(error);
  }
};

/**
 * Order Details API - Returns JSON for AJAX
 */
exports.getOrderDetailsAPI = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('items.product', 'name sku images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Get order details API error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load order details'
    });
  }
};

// ======================================================
// CONTACT MESSAGES METHODS
// ======================================================

/**
 * Contacts page
 */
exports.getContactsPage = async (req, res, next) => {
  try {
    res.render('admin/contacts', {
      title: 'Contact Messages',
      user: req.user,
      currentPage: 'contacts',
      page: 'contacts'
    });
  } catch (error) {
    logger.error('Get contacts page error:', error);
    next(error);
  }
};

/**
 * Get contact messages (API)
 */
exports.getContactMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search, service, date } = req.query;
    const skip = (page - 1) * limit;

    // Check if Contact model is available
    if (!Contact) {
      logger.error('Contact model not found');
      return res.status(500).json({
        success: false,
        message: 'Contact model not initialized'
      });
    }

    let filter = {};
    if (status) filter.status = status;
    if (service) filter.service = service;
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { message: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const messages = await Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Contact.countDocuments(filter);
    
    // Get stats for status cards
    const stats = {
      total: await Contact.countDocuments(),
      new: await Contact.countDocuments({ status: 'new' }),
      read: await Contact.countDocuments({ status: 'read' }),
      replied: await Contact.countDocuments({ status: 'replied' }),
      archived: await Contact.countDocuments({ status: 'archived' })
    };

    res.json({
      success: true,
      messages,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get contact messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving messages: ' + error.message
    });
  }
};

/**
 * Get contact counts
 */
exports.getContactCounts = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const count = await Contact.countDocuments(filter);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    logger.error('Get contact counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving counts'
    });
  }
};

/**
 * Get single contact details
 */
exports.getContactDetails = async (req, res, next) => {
  try {
    const message = await Contact.findById(req.params.id);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    logger.error('Get contact details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving message'
    });
  }
};

/**
 * Update contact status
 */
exports.updateContactStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const message = await Contact.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: Date.now() },
      { new: true }
    );

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message
    });
  } catch (error) {
    logger.error('Update contact status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating message'
    });
  }
};

/**
 * Reply to contact message
 */
exports.replyToContact = async (req, res, next) => {
  try {
    const { reply } = req.body;
    const message = await Contact.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Send email reply
    await emailService.sendEmail(
      message.email,
      `Re: Your UZYHOMES Inquiry - ${message.service}`,
      `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="font-family: 'Playfair Display', serif;">UZYHOMES</h2>
          <p>Dear ${message.name},</p>
          <div style="background: #f8f9fa; padding: 20px; border-left: 3px solid #b8a48c;">
            ${reply.replace(/\n/g, '<br>')}
          </div>
          <p style="margin-top: 20px;">Warm regards,<br>The UZYHOMES Team</p>
        </div>
      `
    );

    // Update status
    message.status = 'replied';
    message.updatedAt = Date.now();
    await message.save();

    res.json({
      success: true,
      message: 'Reply sent successfully'
    });
  } catch (error) {
    logger.error('Reply to contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending reply'
    });
  }
};

/**
 * Delete contact message
 */
exports.deleteContact = async (req, res, next) => {
  try {
    const message = await Contact.findByIdAndDelete(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    logger.error('Delete contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting message'
    });
  }
};

/**
 * Export contacts to CSV
 */
exports.exportContacts = async (req, res, next) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const messages = await Contact.find(filter).sort({ createdAt: -1 });

    // Create CSV
    const csv = [
      ['Date', 'Name', 'Email', 'Phone', 'Service', 'Message', 'Newsletter', 'Status'].join(','),
      ...messages.map(m => [
        new Date(m.createdAt).toLocaleDateString(),
        `"${m.name}"`,
        m.email,
        m.phone || '',
        m.service,
        `"${m.message.replace(/"/g, '""')}"`,
        m.subscribeToNewsletter ? 'Yes' : 'No',
        m.status
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  } catch (error) {
    logger.error('Export contacts error:', error);
    next(error);
  }
};

// ======================================================
// NEWSLETTER SUBSCRIBERS METHODS
// ======================================================

/**
 * Subscribers page
 */
exports.getSubscribersPage = async (req, res, next) => {
  try {
    res.render('admin/subscribers', {
      title: 'Newsletter Subscribers',
      user: req.user,
      currentPage: 'subscribers',
      page: 'subscribers'
    });
  } catch (error) {
    logger.error('Get subscribers page error:', error);
    next(error);
  }
};

/**
 * Get subscribers (API)
 */
exports.getSubscribers = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, source, search, date } = req.query;
    const skip = (page - 1) * limit;

    // Check if Subscriber model is available
    if (!Subscriber) {
      logger.error('Subscriber model not found');
      return res.status(500).json({
        success: false,
        message: 'Subscriber model not initialized'
      });
    }

    let filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.subscribedAt = { $gte: startDate, $lte: endDate };
    }

    const subscribers = await Subscriber.find(filter)
      .sort({ subscribedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Subscriber.countDocuments(filter);
    
    // Get stats
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const stats = {
      active: await Subscriber.countDocuments({ status: 'active' }),
      unsubscribed: await Subscriber.countDocuments({ status: 'unsubscribed' }),
      bounced: await Subscriber.countDocuments({ status: 'bounced' }),
      newThisMonth: await Subscriber.countDocuments({
        status: 'active',
        subscribedAt: { $gte: firstDayOfMonth }
      })
    };

    res.json({
      success: true,
      subscribers,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving subscribers: ' + error.message
    });
  }
};

/**
 * Get subscriber counts
 */
exports.getSubscriberCounts = async (req, res, next) => {
  try {
    const { status } = req.query;
    
    // Check if Subscriber model is available
    if (!Subscriber) {
      logger.error('Subscriber model not found');
      return res.status(500).json({
        success: false,
        message: 'Subscriber model not initialized'
      });
    }
    
    const filter = status ? { status } : {};
    const count = await Subscriber.countDocuments(filter);
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    logger.error('Get subscriber counts error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving counts: ' + error.message
    });
  }
};

/**
 * Delete subscriber
 */
exports.deleteSubscriber = async (req, res, next) => {
  try {
    const subscriber = await Subscriber.findByIdAndDelete(req.params.id);

    if (!subscriber) {
      return res.status(404).json({
        success: false,
        message: 'Subscriber not found'
      });
    }

    res.json({
      success: true,
      message: 'Subscriber deleted successfully'
    });
  } catch (error) {
    logger.error('Delete subscriber error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting subscriber'
    });
  }
};

/**
 * Send newsletter to all active subscribers
 */
exports.sendNewsletter = async (req, res, next) => {
  try {
    const { subject, content, sendTestFirst } = req.body;

    if (!subject || !content) {
      return res.status(400).json({
        success: false,
        message: 'Subject and content are required'
      });
    }

    const subscribers = await Subscriber.find({ status: 'active' });

    if (subscribers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No active subscribers found'
      });
    }

    // Send test first if requested
    if (sendTestFirst) {
      await emailService.sendEmail(
        req.user.email,
        `[TEST] ${subject}`,
        `
          <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="font-family: 'Playfair Display', serif;">UZYHOMES Newsletter</h2>
            <h3>${subject}</h3>
            <div style="background: #f8f9fa; padding: 20px; border-left: 3px solid #b8a48c;">
              ${content.replace(/\n/g, '<br>')}
            </div>
            <p style="margin-top: 20px; color: #6c757d;">
              This is a test email sent to ${subscribers.length} subscribers.
            </p>
          </div>
        `
      );

      return res.json({
        success: true,
        message: 'Test email sent successfully'
      });
    }

    // Send to all subscribers
    const html = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="font-family: 'Playfair Display', serif;">UZYHOMES Newsletter</h2>
        <h3>${subject}</h3>
        <div style="background: #f8f9fa; padding: 20px; border-left: 3px solid #b8a48c;">
          ${content.replace(/\n/g, '<br>')}
        </div>
        <p style="margin-top: 20px; color: #6c757d;">
          <a href="{{unsubscribe_link}}">Unsubscribe</a>
        </p>
      </div>
    `;

    // Send in batches of 50
    for (let i = 0; i < subscribers.length; i += 50) {
      const batch = subscribers.slice(i, i + 50);
      await Promise.all(batch.map(sub => 
        emailService.sendEmail(sub.email, subject, html)
      ));
    }

    logger.info(`Newsletter sent to ${subscribers.length} subscribers`);

    res.json({
      success: true,
      message: `Newsletter sent to ${subscribers.length} subscribers`
    });

  } catch (error) {
    logger.error('Send newsletter error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending newsletter'
    });
  }
};

/**
 * Send test email
 */
exports.sendTestEmail = async (req, res, next) => {
  try {
    const { email, subject, content } = req.body;

    await emailService.sendEmail(
      email,
      subject,
      `
        <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="font-family: 'Playfair Display', serif;">UZYHOMES Newsletter</h2>
          <h3>${subject}</h3>
          <div style="background: #f8f9fa; padding: 20px; border-left: 3px solid #b8a48c;">
            ${content.replace(/\n/g, '<br>')}
          </div>
        </div>
      `
    );

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    logger.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending test email'
    });
  }
};

/**
 * Export subscribers to CSV
 */
exports.exportSubscribers = async (req, res, next) => {
  try {
    const { status } = req.query;
    let filter = {};
    if (status) filter.status = status;

    const subscribers = await Subscriber.find(filter).sort({ subscribedAt: -1 });

    // Create CSV
    const csv = [
      ['Date', 'Email', 'Name', 'Source', 'Status', 'Unsubscribed'].join(','),
      ...subscribers.map(s => [
        new Date(s.subscribedAt).toLocaleDateString(),
        s.email,
        `"${s.name || ''}"`,
        s.source,
        s.status,
        s.unsubscribedAt ? new Date(s.unsubscribedAt).toLocaleDateString() : ''
      ].join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=subscribers.csv');
    res.send(csv);
  } catch (error) {
    logger.error('Export subscribers error:', error);
    next(error);
  }
};

module.exports = exports;
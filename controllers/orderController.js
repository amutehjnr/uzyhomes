const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const User = require('../models/User');
const Coupon = require('../models/Coupon');
const emailService = require('../services/emailService');
const paystackService = require('../services/paystackService');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Create a new order
 */
exports.createOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress, billingAddress, couponCode } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order must contain items' });
    }

    // Validate addresses
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Shipping address is required' });
    }

    let subtotal = 0;
    const orderItems = [];

    // Process order items
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.discountPrice || product.price
      });

      subtotal += (product.discountPrice || product.price) * item.quantity;
    }

    // Calculate taxes and shipping
    const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% tax
    const shippingCost = subtotal > 50000 ? 0 : 2500; // Free shipping over ₦50,000
    let discount = 0;
    let coupon = null;

    // Validate and apply coupon
    if (couponCode) {
      coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(), 
        isActive: true,
        validFrom: { $lte: new Date() },
        validUntil: { $gte: new Date() }
      });

      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or expired coupon code' });
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit exceeded' });
      }

      if (subtotal < coupon.minPurchaseAmount) {
        return res.status(400).json({ 
          message: `Minimum purchase amount for this coupon is ₦${coupon.minPurchaseAmount}` 
        });
      }

      discount = coupon.discountType === 'percentage'
        ? Math.round((subtotal * coupon.discountValue) / 100 * 100) / 100
        : coupon.discountValue;

      if (coupon.maxDiscountAmount) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    }

    const total = Math.round((subtotal + tax + shippingCost - discount) * 100) / 100;

    // Generate unique reference
    const reference = `UZYHOMES-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // Create order
    const order = new Order({
      customer: req.user._id,
      items: orderItems,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      subtotal,
      tax,
      shippingCost,
      discount,
      total,
      couponCode: coupon ? coupon.code : undefined,
      paymentMethod: 'paystack',
      orderStatus: 'pending',
      paymentStatus: 'pending',
      paymentDetails: {
        reference
      }
    });

    await order.save();

    // Increment coupon usage if applied
    if (coupon) {
      coupon.usageCount += 1;
      await coupon.save();
    }

    // Initialize Paystack transaction
    try {
      const paystackInit = await paystackService.initializeTransaction({
        amount: Math.round(total * 100), // Convert to kobo
        email: req.user.email,
        reference,
        orderId: order._id.toString(),
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerName: `${req.user.firstName} ${req.user.lastName}`,
          customerEmail: req.user.email
        }
      });

      logger.info(`Paystack transaction initialized for order ${order.orderNumber}`);

      return res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          total: order.total,
          reference
        },
        payment: {
          authorizationUrl: paystackInit.authorization_url,
          accessCode: paystackInit.access_code,
          reference: paystackInit.reference
        }
      });
    } catch (paystackError) {
      logger.error(`Paystack initialization failed: ${paystackError.message}`);
      
      // Delete order if payment initialization fails
      await Order.findByIdAndDelete(order._id);
      
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize payment. Please try again.'
      });
    }
  } catch (error) {
    logger.error(`Order creation failed: ${error.message}`);
    next(error);
  }
};

/**
 * Verify payment and complete order
 */
exports.verifyPayment = async (req, res, next) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ message: 'Payment reference is required' });
    }

    // Verify with Paystack
    const verification = await paystackService.verifyTransaction(reference);

    if (verification.status !== 'success') {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
        status: verification.status
      });
    }

    // Find order by reference
    const order = await Order.findOne({ 'paymentDetails.reference': reference })
      .populate('customer')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Prevent duplicate payment processing
    if (order.paymentStatus === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already processed',
        order
      });
    }

    // Update order with payment details
    order.paymentStatus = 'completed';
    order.orderStatus = 'confirmed';
    order.paymentDetails = {
      reference,
      transactionId: verification.id,
      paystackTransactionId: verification.id,
      cardBrand: verification.authorization?.brand || 'unknown',
      cardLast4: verification.authorization?.last4 || 'N/A',
      paidAt: verification.paid_at
    };

    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment verified and confirmed'
    });

    await order.save();

    // Create payment record
    const payment = new Payment({
      order: order._id,
      customer: order.customer._id,
      amount: order.total,
      currency: 'NGN',
      paymentMethod: 'paystack',
      status: 'completed',
      transactionId: verification.id,
      paymentDetails: {
        paystackTransactionId: verification.id,
        cardBrand: verification.authorization?.brand,
        cardLast4: verification.authorization?.last4
      }
    });

    await payment.save();

    // Update product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
    }

    // Clear cart
    await Cart.deleteOne({ customer: order.customer._id });

    // Send confirmation emails
    await emailService.sendOrderConfirmation(order, order.customer);
    await emailService.sendPaymentSuccessEmail(order, order.customer, reference);

    logger.info(`Payment verified for order ${order.orderNumber}`);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        total: order.total
      }
    });
  } catch (error) {
    logger.error(`Payment verification failed: ${error.message}`);
    next(error);
  }
};

/**
 * Get user's orders
 */
exports.getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let filter = { customer: req.user._id };
    if (status) filter.orderStatus = status;

    const skip = (page - 1) * limit;
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('items.product', 'name price images')
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
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order by ID
 */
exports.getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product')
      .populate('customer', 'firstName lastName email phone');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status (Admin only)
 */
exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note, trackingNumber, shippingProvider } = req.body;

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { 
        orderStatus: status,
        ...(trackingNumber && { trackingNumber }),
        ...(shippingProvider && { shippingProvider })
      },
      { new: true }
    ).populate('items.product').populate('customer');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Add to status history
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note
    });

    await order.save();

    // Send status update email
    await emailService.sendOrderStatusUpdate(order, order.customer);

    logger.info(`Order ${order.orderNumber} status updated to ${status}`);

    res.json({
      success: true,
      message: 'Order status updated',
      order
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request refund
 */
exports.requestRefund = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId).populate('customer');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if order can be refunded
    if (!['delivered', 'completed'].includes(order.orderStatus)) {
      return res.status(400).json({ 
        message: 'Order cannot be refunded in current status' 
      });
    }

    if (order.paymentStatus !== 'completed') {
      return res.status(400).json({ 
        message: 'Can only refund completed payments' 
      });
    }

    // Create refund
    try {
      const refund = await paystackService.createRefund({
        transactionId: order.paymentDetails.paystackTransactionId
      });

      order.paymentStatus = 'refunded';
      order.orderStatus = 'refunded';
      order.statusHistory.push({
        status: 'refunded',
        timestamp: new Date(),
        note: `Refund initiated - Reason: ${reason}`
      });

      await order.save();

      // Send refund email
      await emailService.sendRefundEmail(order.customer, order, order.total);

      logger.info(`Refund initiated for order ${order.orderNumber}`);

      res.json({
        success: true,
        message: 'Refund initiated successfully',
        refund: {
          refundId: refund.refund,
          status: refund.status,
          amount: order.total
        }
      });
    } catch (refundError) {
      logger.error(`Refund failed: ${refundError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Failed to process refund',
        error: refundError.message
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id).populate('customer');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if order can be cancelled
    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({ message: 'Order cannot be cancelled' });
    }

    order.orderStatus = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: 'Order cancelled by user'
    });

    await order.save();

    // Refund if payment was completed
    if (order.paymentStatus === 'completed' && order.paymentDetails.paystackTransactionId) {
      try {
        await paystackService.createRefund({
          transactionId: order.paymentDetails.paystackTransactionId
        });
        order.paymentStatus = 'refunded';
        await order.save();
      } catch (refundError) {
        logger.warn(`Refund failed for cancelled order ${order.orderNumber}: ${refundError.message}`);
      }
    }

    logger.info(`Order ${order.orderNumber} cancelled`);

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    next(error);
  }
};
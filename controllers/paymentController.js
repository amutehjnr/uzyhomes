const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paystackService = require('../services/paystackService');
const logger = require('../config/logger');

/**
 * Get payment history
 */
exports.getPaymentHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    let filter = { customer: req.user._id };
    if (status) filter.status = status;

    const skip = (page - 1) * limit;
    const total = await Payment.countDocuments(filter);
    const payments = await Payment.find(filter)
      .populate('order', 'orderNumber total')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({
      success: true,
      payments,
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
 * Get payment details
 */
exports.getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order')
      .populate('customer', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Authorization check
    if (payment.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retry payment
 */
exports.retryPayment = async (req, res, next) => {
  try {
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId).populate('customer');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Authorization check
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if order can be retried
    if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'pending') {
      return res.status(400).json({ 
        message: 'Payment cannot be retried in current status' 
      });
    }

    // Generate new reference and reinitialize payment
    const { v4: uuidv4 } = require('uuid');
    const newReference = `UZYHOMES-${Date.now()}-${uuidv4().slice(0, 8)}`;

    try {
      const paystackInit = await paystackService.initializeTransaction({
        amount: Math.round(order.total * 100),
        email: order.customer.email,
        reference: newReference,
        orderId: order._id.toString(),
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`
        }
      });

      // Update order with new reference
      order.paymentDetails.reference = newReference;
      order.statusHistory.push({
        status: 'payment_retried',
        timestamp: new Date(),
        note: 'Payment retry initiated'
      });

      await order.save();

      logger.info(`Payment retried for order ${order.orderNumber}`);

      res.json({
        success: true,
        message: 'Payment retry initiated',
        payment: {
          authorizationUrl: paystackInit.authorization_url,
          accessCode: paystackInit.access_code,
          reference: newReference
        }
      });
    } catch (paystackError) {
      logger.error(`Payment retry failed: ${paystackError.message}`);
      return res.status(400).json({
        success: false,
        message: 'Failed to retry payment',
        error: paystackError.message
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = exports;
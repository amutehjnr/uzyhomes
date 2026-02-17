// controllers/paymentController.js
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const paystackService = require('../services/paystackService');
const logger = require('../config/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Initialize payment for an order
 */
exports.initializePayment = async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.body;

    // Find order
    const order = await Order.findById(orderId).populate('customer');
    
    if (!order) {
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Authorization check
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to pay for this order' 
      });
    }

    // Check if order can be paid
    if (order.paymentStatus === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Order has already been paid' 
      });
    }

    // Generate unique reference
    const reference = `UZY-${Date.now()}-${uuidv4().slice(0, 8)}`.toUpperCase();

    // Check if payment already exists
    let payment = await Payment.findOne({ order: orderId });
    
    if (payment && payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already completed for this order'
      });
    }

    // Build callback URL
    const callbackUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/payment/verify`;
    // Initialize payment with Paystack
    try {
      const paystackData = await paystackService.initializeTransaction({
        amount: Math.round(order.total * 100), // Paystack uses kobo
        email: order.customer.email,
        reference,
        callbackUrl,
        orderId: order._id.toString(),
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
          customerId: order.customer._id.toString(),
          paymentMethod
        }
      });

      // Create or update payment record
      if (!payment) {
        payment = new Payment({
          order: order._id,
          customer: req.user._id,
          amount: order.total,
          currency: 'NGN', // Explicitly set currency
          paymentMethod,
          reference,
          status: 'pending',
          provider: 'paystack',
          paymentDetails: {
            authorizationUrl: paystackData.authorization_url,
            accessCode: paystackData.access_code
          },
          metadata: {
            orderNumber: order.orderNumber,
            email: order.customer.email
          }
        });
      } else {
        payment.reference = reference;
        payment.status = 'pending';
        payment.paymentDetails = {
          authorizationUrl: paystackData.authorization_url,
          accessCode: paystackData.access_code
        };
      }

      await payment.save();

      // Update order with payment reference
      order.paymentDetails = {
        ...order.paymentDetails,
        reference,
        paymentId: payment._id
      };
      
      order.statusHistory.push({
        status: 'payment_initiated',
        timestamp: new Date(),
        note: `Payment initiated with reference: ${reference}`
      });
      
      await order.save();

      logger.info(`Payment initialized for order ${order.orderNumber}: ${reference}`);

      res.json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          paymentId: payment._id,
          reference,
          authorizationUrl: paystackData.authorization_url,
          accessCode: paystackData.access_code
        }
      });

    } catch (paystackError) {
      logger.error(`Paystack initialization failed: ${paystackError.message}`);
      
      // Create failed payment record
      if (!payment) {
        payment = new Payment({
          order: order._id,
          customer: req.user._id,
          amount: order.total,
          currency: 'NGN',
          paymentMethod,
          reference,
          status: 'failed',
          response: { error: paystackError.message }
        });
        await payment.save();
      }

      return res.status(400).json({
        success: false,
        message: 'Failed to initialize payment',
        error: paystackError.message
      });
    }

  } catch (error) {
    next(error);
  }
};

/**
 * Verify payment (callback endpoint)
 */
// controllers/paymentController.js - Update verifyPayment function
exports.verifyPayment = async (req, res, next) => {
  console.log('='.repeat(50));
  console.log('🔵 VERIFY PAYMENT CALLED - START');
  console.log('Time:', new Date().toISOString());
  console.log('Request query:', req.query);
  console.log('Request URL:', req.url);
  console.log('='.repeat(50));
  
  try {
    // Paystack sends both 'reference' and 'trxref' - we can use either
    const { reference, trxref } = req.query;
    const paymentReference = reference || trxref;

    if (!paymentReference) {
      console.log('❌ No reference provided');
      return res.redirect('/payment-failed?error=No reference provided');
    }

    console.log('🔍 Looking for payment with reference:', paymentReference);
    
    // Find payment
    const payment = await Payment.findOne({ reference: paymentReference }).populate('order');
    
    if (!payment) {
      console.log('❌ Payment not found for reference:', paymentReference);
      return res.redirect('/payment-failed?error=Payment not found');
    }

    console.log('✅ Payment found, verifying with Paystack...');

    // Verify with Paystack
    const verificationData = await paystackService.verifyTransaction(paymentReference);
    console.log('✅ Paystack verification response:', verificationData.status);
    
    // Update payment record
    payment.status = verificationData.status === 'success' ? 'completed' : 'failed';
    payment.transactionId = verificationData.id;
    payment.paymentDetails = {
      ...payment.paymentDetails,
      ...verificationData,
      paidAt: verificationData.paid_at,
      channel: verificationData.channel,
      authorization: verificationData.authorization,
      customer: verificationData.customer
    };
    payment.response = verificationData;
    
    await payment.save();
    console.log('✅ Payment record updated, new status:', payment.status);

    // Update order status
    const order = await Order.findById(payment.order);
    if (order) {
      console.log('📦 Updating order:', order.orderNumber);
      
      if (verificationData.status === 'success') {
        order.paymentStatus = 'completed';
        order.orderStatus = 'confirmed';
        order.paymentDetails = {
          ...order.paymentDetails,
          transactionId: verificationData.id,
          paidAt: verificationData.paid_at,
          channel: verificationData.channel
        };
        
        order.statusHistory.push({
          status: 'payment_completed',
          timestamp: new Date(),
          note: `Payment completed via ${verificationData.channel}`
        });
        console.log('✅ Order marked as paid');
      } else {
        order.paymentStatus = 'failed';
        order.statusHistory.push({
          status: 'payment_failed',
          timestamp: new Date(),
          note: `Payment failed: ${verificationData.gateway_response || 'Unknown error'}`
        });
        console.log('❌ Order marked as failed');
      }
      
      await order.save();
      console.log('✅ Order saved');
    }

    // Redirect to appropriate page
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';
    
    if (verificationData.status === 'success') {
      console.log('🟢 Redirecting to payment success page');
      return res.redirect(`${frontendUrl}/payment-success?order=${order._id}`);
    } else {
      console.log('🔴 Redirecting to payment failed page');
      return res.redirect(`${frontendUrl}/payment-failed?order=${order._id}&error=${encodeURIComponent(verificationData.gateway_response || 'Payment failed')}`);
    }

  } catch (error) {
    console.error('❌ Fatal error in verifyPayment:', error);
    
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';
    return res.redirect(`${frontendUrl}/payment-failed?error=${encodeURIComponent(error.message)}`);
  }
};

/**
 * Handle Paystack webhook
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Verify webhook signature
    const signature = req.headers['x-paystack-signature'];
    const payload = JSON.stringify(req.body);
    
    if (!paystackService.verifyWebhookSignature(signature, payload)) {
      logger.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = req.body;
    logger.info(`Webhook received: ${event.event}`);

    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      
      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;
      
      case 'refund.processed':
        await handleRefundProcessed(event.data);
        break;
      
      case 'refund.failed':
        await handleRefundFailed(event.data);
        break;
      
      default:
        logger.info(`Unhandled webhook event: ${event.event}`);
    }

    res.status(200).json({ received: true });

  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

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
      return res.status(404).json({ 
        success: false, 
        message: 'Payment not found' 
      });
    }

    // Authorization check
    if (payment.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
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
      return res.status(404).json({ 
        success: false, 
        message: 'Order not found' 
      });
    }

    // Authorization check
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized' 
      });
    }

    // Check if order can be retried
    if (order.paymentStatus !== 'failed' && order.paymentStatus !== 'pending') {
      return res.status(400).json({ 
        success: false,
        message: 'Payment cannot be retried in current status' 
      });
    }

    // Generate new reference
    const newReference = `UZY-${Date.now()}-${uuidv4().slice(0, 8)}`.toUpperCase();

    try {
      const paystackInit = await paystackService.initializeTransaction({
        amount: Math.round(order.total * 100),
        email: order.customer.email,
        reference: newReference,
        orderId: order._id.toString(),
        metadata: {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
          customerId: order.customer._id.toString(),
          retry: true
        }
      });

      // Create new payment record
      const payment = new Payment({
        order: order._id,
        customer: req.user._id,
        amount: order.total,
        currency: 'NGN',
        paymentMethod: 'card',
        reference: newReference,
        status: 'pending',
        provider: 'paystack',
        paymentDetails: {
          authorizationUrl: paystackInit.authorization_url,
          accessCode: paystackInit.access_code
        },
        metadata: {
          orderNumber: order.orderNumber,
          email: order.customer.email,
          retry: true
        }
      });
      
      await payment.save();

      // Update order
      order.paymentDetails = {
        ...order.paymentDetails,
        reference: newReference,
        paymentId: payment._id
      };
      
      order.statusHistory.push({
        status: 'payment_retried',
        timestamp: new Date(),
        note: `Payment retry initiated: ${newReference}`
      });

      await order.save();

      logger.info(`Payment retried for order ${order.orderNumber}`);

      res.json({
        success: true,
        message: 'Payment retry initiated',
        data: {
          paymentId: payment._id,
          reference: newReference,
          authorizationUrl: paystackInit.authorization_url,
          accessCode: paystackInit.access_code
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

/**
 * Handle charge success webhook
 */
async function handleChargeSuccess(data) {
  try {
    const payment = await Payment.findOne({ reference: data.reference });
    
    if (!payment) {
      logger.error(`Payment not found for reference: ${data.reference}`);
      return;
    }

    payment.status = 'completed';
    payment.transactionId = data.id;
    payment.paymentDetails = {
      ...payment.paymentDetails,
      ...data,
      paidAt: data.paid_at,
      channel: data.channel,
      authorization: data.authorization,
      customer: data.customer
    };
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.paymentStatus = 'completed';
      order.orderStatus = 'confirmed';
      order.paymentDetails = {
        ...order.paymentDetails,
        transactionId: data.id,
        paidAt: data.paid_at,
        channel: data.channel
      };
      
      order.statusHistory.push({
        status: 'payment_completed',
        timestamp: new Date(),
        note: `Payment completed via ${data.channel}`
      });
      
      await order.save();
    }

    logger.info(`Webhook: Payment completed for reference ${data.reference}`);
  } catch (error) {
    logger.error('Error handling charge success webhook:', error);
  }
}

/**
 * Handle charge failed webhook
 */
async function handleChargeFailed(data) {
  try {
    const payment = await Payment.findOne({ reference: data.reference });
    
    if (!payment) {
      logger.error(`Payment not found for reference: ${data.reference}`);
      return;
    }

    payment.status = 'failed';
    payment.response = data;
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.paymentStatus = 'failed';
      order.statusHistory.push({
        status: 'payment_failed',
        timestamp: new Date(),
        note: `Payment failed: ${data.gateway_response || 'Unknown error'}`
      });
      await order.save();
    }

    logger.info(`Webhook: Payment failed for reference ${data.reference}`);
  } catch (error) {
    logger.error('Error handling charge failed webhook:', error);
  }
}

/**
 * Handle refund processed webhook
 */
async function handleRefundProcessed(data) {
  try {
    const payment = await Payment.findOne({ reference: data.transaction.reference });
    
    if (!payment) {
      logger.error(`Payment not found for refund transaction: ${data.transaction.reference}`);
      return;
    }

    payment.status = 'refunded';
    payment.paymentDetails = {
      ...payment.paymentDetails,
      refund: data
    };
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.paymentStatus = 'refunded';
      order.orderStatus = 'refunded';
      order.statusHistory.push({
        status: 'refunded',
        timestamp: new Date(),
        note: `Refund processed: ₦${(data.amount / 100).toLocaleString()}`
      });
      await order.save();
    }

    logger.info(`Webhook: Refund processed for reference ${data.transaction.reference}`);
  } catch (error) {
    logger.error('Error handling refund processed webhook:', error);
  }
}

/**
 * Handle refund failed webhook
 */
async function handleRefundFailed(data) {
  try {
    const payment = await Payment.findOne({ reference: data.transaction.reference });
    
    if (!payment) {
      logger.error(`Payment not found for refund transaction: ${data.transaction.reference}`);
      return;
    }

    payment.paymentDetails = {
      ...payment.paymentDetails,
      refundError: data
    };
    await payment.save();

    const order = await Order.findById(payment.order);
    if (order) {
      order.statusHistory.push({
        status: 'refund_failed',
        timestamp: new Date(),
        note: `Refund failed: ${data.gateway_response || 'Unknown error'}`
      });
      await order.save();
    }

    logger.info(`Webhook: Refund failed for reference ${data.transaction.reference}`);
  } catch (error) {
    logger.error('Error handling refund failed webhook:', error);
  }
}

/**
 * Get user's payments (for account page - alias for getPaymentHistory)
 */
exports.getUserPayments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, method } = req.query;

    let filter = { customer: req.user._id };
    if (status) filter.status = status;
    if (method) filter.paymentMethod = method;

    const skip = (page - 1) * limit;
    const total = await Payment.countDocuments(filter);
    
    const payments = await Payment.find(filter)
      .populate('order', 'orderNumber total')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Format the response to match what the frontend expects
    res.json({
      success: true,
      transactions: payments, // Using 'transactions' to match frontend
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get user payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load payments'
    });
  }
};

/**
 * Get single payment details for user
 */
exports.getPaymentDetails = async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      customer: req.user._id
    }).populate('order');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      payment
    });
  } catch (error) {
    logger.error('Get payment details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load payment details'
    });
  }
};

module.exports = exports;
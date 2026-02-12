const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const paystackService = require('../services/paystackService');
const emailService = require('../services/emailService');
const logger = require('../config/logger');

/**
 * Handle Paystack webhook events
 */
exports.handleWebhook = async (req, res) => {
  try {
    const rawBody = req.rawBody || req.body;
    const signature = req.headers['x-paystack-signature'];

    // Verify webhook signature
    const isValid = paystackService.verifyWebhookSignature(
      signature,
      typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody)
    );

    if (!isValid) {
      logger.warn('Invalid Paystack webhook signature');
      return res.status(403).json({ message: 'Invalid signature' });
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

    logger.info(`Paystack webhook received: ${event.event}`);

    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;

      case 'charge.failed':
        await handleChargeFailed(event.data);
        break;

      case 'refund.created':
        await handleRefundCreated(event.data);
        break;

      case 'refund.failed':
        await handleRefundFailed(event.data);
        break;

      default:
        logger.info(`Unhandled event type: ${event.event}`);
    }

    res.json({ status: 'ok' });
  } catch (error) {
    logger.error(`Webhook processing error: ${error.message}`);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle successful charge
 */
async function handleChargeSuccess(data) {
  try {
    const { reference, customer, amount, authorization } = data;

    // Find order by reference
    const order = await Order.findOne({ 'paymentDetails.reference': reference })
      .populate('customer')
      .populate('items.product');

    if (!order) {
      logger.warn(`Order not found for reference: ${reference}`);
      return;
    }

    // Prevent duplicate processing
    if (order.paymentStatus === 'completed') {
      logger.info(`Order ${order.orderNumber} already processed`);
      return;
    }

    // Update order
    order.paymentStatus = 'completed';
    order.orderStatus = 'confirmed';
    order.paymentDetails = {
      reference,
      paystackTransactionId: data.id,
      cardBrand: authorization?.brand || 'unknown',
      cardLast4: authorization?.last4 || 'N/A',
      paidAt: data.paid_at,
      customerEmail: customer?.email
    };

    order.statusHistory.push({
      status: 'confirmed',
      timestamp: new Date(),
      note: 'Payment confirmed via Paystack webhook'
    });

    await order.save();

    // Create payment record
    const payment = new Payment({
      order: order._id,
      customer: order.customer._id,
      amount: amount / 100, // Convert from kobo
      currency: 'NGN',
      paymentMethod: 'paystack',
      status: 'completed',
      transactionId: data.id,
      paymentDetails: {
        paystackTransactionId: data.id,
        cardBrand: authorization?.brand,
        cardLast4: authorization?.last4
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

    logger.info(`Payment confirmed for order ${order.orderNumber}`);
  } catch (error) {
    logger.error(`Error handling charge success: ${error.message}`);
  }
}

/**
 * Handle failed charge
 */
async function handleChargeFailed(data) {
  try {
    const { reference, reason } = data;

    const order = await Order.findOne({ 'paymentDetails.reference': reference })
      .populate('customer');

    if (!order) {
      logger.warn(`Order not found for failed charge: ${reference}`);
      return;
    }

    order.paymentStatus = 'failed';
    order.statusHistory.push({
      status: 'payment_failed',
      timestamp: new Date(),
      note: `Payment failed - Reason: ${reason}`
    });

    await order.save();

    // Send failure email
    await emailService.sendPaymentFailedEmail(
      order.customer,
      order._id,
      reason || 'Payment processing failed'
    );

    logger.warn(`Payment failed for order ${order.orderNumber}: ${reason}`);
  } catch (error) {
    logger.error(`Error handling charge failure: ${error.message}`);
  }
}

/**
 * Handle refund creation
 */
async function handleRefundCreated(data) {
  try {
    const { transaction, status } = data;

    const payment = await Payment.findOne({ transactionId: transaction })
      .populate('order')
      .populate('customer');

    if (!payment) {
      logger.warn(`Payment not found for refund: ${transaction}`);
      return;
    }

    const order = payment.order;
    order.paymentStatus = 'refunded';
    order.orderStatus = 'refunded';

    order.statusHistory.push({
      status: 'refunded',
      timestamp: new Date(),
      note: 'Refund initiated'
    });

    await order.save();

    // Update payment record
    payment.status = 'refunded';
    payment.refundReason = 'Customer requested refund';
    await payment.save();

    // Send refund email
    await emailService.sendRefundEmail(payment.customer, order, order.total);

    logger.info(`Refund created for order ${order.orderNumber}`);
  } catch (error) {
    logger.error(`Error handling refund creation: ${error.message}`);
  }
}

/**
 * Handle failed refund
 */
async function handleRefundFailed(data) {
  try {
    const { transaction, reason } = data;

    const payment = await Payment.findOne({ transactionId: transaction })
      .populate('order');

    if (!payment) {
      logger.warn(`Payment not found for failed refund: ${transaction}`);
      return;
    }

    logger.error(`Refund failed for order ${payment.order.orderNumber}: ${reason}`);
  } catch (error) {
    logger.error(`Error handling refund failure: ${error.message}`);
  }
}

module.exports = exports;
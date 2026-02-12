const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

exports.sendEmail = async (to, subject, html, text) => {
  try {
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to,
      subject,
      html,
      text
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    throw error;
  }
};

exports.sendWelcomeEmail = async (user) => {
  const html = `
    <h1>Welcome to UZYHOMES!</h1>
    <p>Hi ${user.firstName},</p>
    <p>Thank you for joining UZYHOMES. We're excited to have you!</p>
    <p>Start exploring our collection of quiet luxury bedding, interiors, and décor.</p>
    <a href="${process.env.FRONTEND_URL}/shop" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Shop Now</a>
  `;

  return exports.sendEmail(user.email, 'Welcome to UZYHOMES', html);
};

exports.sendOrderConfirmation = async (order, user) => {
  const itemsHtml = order.items
    .map(item => `
      <tr>
        <td>${item.product.name}</td>
        <td>${item.quantity}</td>
        <td>₦${(item.price).toLocaleString()}</td>
      </tr>
    `)
    .join('');

  const html = `
    <h1>Order Confirmation</h1>
    <p>Hi ${user.firstName},</p>
    <p>Thank you for your order!</p>
    <h3>Order Number: ${order.orderNumber}</h3>
    <table border="1" cellpadding="10" style="border-collapse: collapse;">
      <tr style="background-color: #f0f0f0;">
        <th>Product</th>
        <th>Quantity</th>
        <th>Price</th>
      </tr>
      ${itemsHtml}
    </table>
    <p style="margin-top: 20px;"><strong>Subtotal: ₦${order.subtotal.toLocaleString()}</strong></p>
    <p><strong>Tax: ₦${order.tax.toLocaleString()}</strong></p>
    <p><strong>Shipping: ₦${order.shippingCost.toLocaleString()}</strong></p>
    <p style="font-size: 18px; color: #0066cc;"><strong>Total: ₦${order.total.toLocaleString()}</strong></p>
    <a href="${process.env.FRONTEND_URL}/orders/${order._id}">View Order Details</a>
  `;

  return exports.sendEmail(user.email, 'Order Confirmation - UZYHOMES', html);
};

exports.sendPaymentSuccessEmail = async (order, user, paymentReference) => {
  const html = `
    <h1>Payment Successful</h1>
    <p>Hi ${user.firstName},</p>
    <p>Your payment has been processed successfully!</p>
    <h3>Order Number: ${order.orderNumber}</h3>
    <p><strong>Reference: ${paymentReference}</strong></p>
    <p style="font-size: 18px; color: #28a745;"><strong>Amount Paid: ₦${order.total.toLocaleString()}</strong></p>
    <p>Your order will be processed and you'll receive a shipping notification soon.</p>
    <a href="${process.env.FRONTEND_URL}/orders/${order._id}">Track Your Order</a>
  `;

  return exports.sendEmail(user.email, 'Payment Successful - UZYHOMES', html);
};

exports.sendPaymentFailedEmail = async (user, orderId, reason) => {
  const html = `
    <h1>Payment Failed</h1>
    <p>Hi ${user.firstName},</p>
    <p>Unfortunately, your payment could not be processed.</p>
    <p><strong>Reason: ${reason}</strong></p>
    <p>Please try again or contact support if you need assistance.</p>
    <a href="${process.env.FRONTEND_URL}/orders/${orderId}">Retry Payment</a>
  `;

  return exports.sendEmail(user.email, 'Payment Failed - UZYHOMES', html);
};

exports.sendPasswordResetEmail = async (user, resetToken) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
  
  const html = `
    <h1>Password Reset Request</h1>
    <p>Hi ${user.firstName},</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
    <p style="margin-top: 20px; font-size: 12px; color: #666;">This link expires in 24 hours.</p>
  `;

  return exports.sendEmail(user.email, 'Password Reset Request', html);
};

exports.sendOrderStatusUpdate = async (order, user) => {
  const statusMessages = {
    'confirmed': 'Your order has been confirmed and is being prepared',
    'processing': 'Your order is being processed',
    'shipped': 'Your order is on its way!',
    'delivered': 'Your order has been delivered',
    'cancelled': 'Your order has been cancelled'
  };

  const html = `
    <h1>Order Status Update</h1>
    <p>Hi ${user.firstName},</p>
    <p>Your order ${order.orderNumber} status has been updated:</p>
    <h3 style="color: #0066cc;">${order.orderStatus.toUpperCase()}</h3>
    <p>${statusMessages[order.orderStatus] || 'Your order status has changed'}</p>
    ${order.trackingNumber ? `<p><strong>Tracking Number: ${order.trackingNumber}</strong></p>` : ''}
    <a href="${process.env.FRONTEND_URL}/orders/${order._id}">Track Your Order</a>
  `;

  return exports.sendEmail(user.email, 'Order Status Update - UZYHOMES', html);
};

exports.sendRefundEmail = async (user, order, refundAmount) => {
  const html = `
    <h1>Refund Processed</h1>
    <p>Hi ${user.firstName},</p>
    <p>Your refund has been processed successfully!</p>
    <p><strong>Order Number: ${order.orderNumber}</strong></p>
    <p style="font-size: 18px; color: #28a745;"><strong>Refund Amount: ₦${refundAmount.toLocaleString()}</strong></p>
    <p>The refund will be credited to your original payment method within 3-5 business days.</p>
  `;

  return exports.sendEmail(user.email, 'Refund Processed - UZYHOMES', html);
};

module.exports = exports;
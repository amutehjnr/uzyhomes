// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'NGN' // Changed from USD to NGN
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'transfer', 'paypal', 'bank_transfer', 'ussd', 'mobile_money'], // Updated enum
    required: true
  },
  provider: {
    type: String,
    enum: ['paystack', 'paypal', 'stripe'],
    default: 'paystack'
  },
  reference: {
    type: String,
    required: true,
    unique: true
  },
  transactionId: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'abandoned'],
    default: 'pending'
  },
  paymentDetails: {
    authorizationUrl: String,
    accessCode: String,
    authorization: {
      authorizationCode: String,
      bin: String,
      last4: String,
      expMonth: String,
      expYear: String,
      cardType: String,
      bank: String,
      countryCode: String,
      brand: String,
      reusable: Boolean
    },
    paidAt: Date,
    channel: String
  },
  metadata: {
    type: Map,
    of: String
  },
  response: mongoose.Schema.Types.Mixed,
  errorMessage: String,
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundedAt: Date,
  receiptUrl: String,
  ipAddress: String,
  userAgent: String,
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for faster queries
paymentSchema.index({ reference: 1 });
paymentSchema.index({ order: 1 });
paymentSchema.index({ customer: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
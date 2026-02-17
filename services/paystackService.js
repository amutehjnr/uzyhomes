// services/paystackService.js
const axios = require('axios');
const logger = require('../config/logger');

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

const paystackClient = axios.create({
  baseURL: PAYSTACK_BASE_URL,
  headers: {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  }
});

/**
 * Initialize a Paystack transaction
 * @param {Object} params - Transaction parameters
 * @returns {Promise} Paystack response
 */
// In services/paystackService.js - update initializeTransaction
exports.initializeTransaction = async (params) => {
  try {
    const {
      amount,
      email,
      reference,
      callbackUrl,
      orderId,
      metadata = {}
    } = params;

    console.log('💰 Initializing Paystack transaction:', { 
      amount, 
      email, 
      reference, 
      callbackUrl,
      currency: 'NGN' 
    });

    const response = await paystackClient.post('/transaction/initialize', {
      amount,
      email,
      reference,
      currency: 'NGN', // Make sure this is set
      callback_url: callbackUrl,
      metadata: {
        orderId,
        ...metadata
      }
    });

    logger.info(`Transaction initialized: ${reference} - ${response.data.data.authorization_url}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to initialize Paystack transaction: ${error.message}`);
    throw new Error(`Paystack Error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Verify a Paystack transaction
 * @param {String} reference - Transaction reference
 * @returns {Promise} Verification result
 */
exports.verifyTransaction = async (reference) => {
  try {
    console.log('🔍 Verifying Paystack transaction:', reference);
    
    const response = await paystackClient.get(`/transaction/verify/${reference}`);

    logger.info(`Transaction verified: ${reference} - ${response.data.data.status}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to verify Paystack transaction: ${error.message}`);
    throw new Error(`Paystack Error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Get transaction details by ID
 * @param {Number} transactionId - Transaction ID from Paystack
 * @returns {Promise} Transaction details
 */
exports.getTransaction = async (transactionId) => {
  try {
    const response = await paystackClient.get(`/transaction/${transactionId}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to get Paystack transaction: ${error.message}`);
    throw error;
  }
};

/**
 * List all transactions
 * @param {Object} params - Query parameters
 * @returns {Promise} List of transactions
 */
exports.listTransactions = async (params = {}) => {
  try {
    const response = await paystackClient.get('/transaction', { params });
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to list Paystack transactions: ${error.message}`);
    throw error;
  }
};

/**
 * Create a refund
 * @param {Object} params - Refund parameters
 * @returns {Promise} Refund response
 */
exports.createRefund = async (params) => {
  try {
    const {
      transactionId,
      amount = undefined // undefined means full refund
    } = params;

    const refundParams = { transaction: transactionId };
    if (amount) {
      refundParams.amount = amount;
    }

    const response = await paystackClient.post('/refund', refundParams);

    logger.info(`Refund initiated: ${transactionId}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to create Paystack refund: ${error.message}`);
    throw new Error(`Refund Error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Get refund status
 * @param {Number} refundId - Refund ID
 * @returns {Promise} Refund details
 */
exports.getRefund = async (refundId) => {
  try {
    const response = await paystackClient.get(`/refund/${refundId}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to get refund: ${error.message}`);
    throw error;
  }
};

/**
 * Create a customer on Paystack
 * @param {Object} params - Customer parameters
 * @returns {Promise} Customer response
 */
exports.createCustomer = async (params) => {
  try {
    const { email, firstName, lastName, phone } = params;

    const response = await paystackClient.post('/customer', {
      email,
      first_name: firstName,
      last_name: lastName,
      phone
    });

    logger.info(`Paystack customer created: ${response.data.data.customer_code}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to create Paystack customer: ${error.message}`);
    throw error;
  }
};

/**
 * Get customer by code
 * @param {String} customerCode - Paystack customer code
 * @returns {Promise} Customer details
 */
exports.getCustomer = async (customerCode) => {
  try {
    const response = await paystackClient.get(`/customer/${customerCode}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to get customer: ${error.message}`);
    throw error;
  }
};

/**
 * Charge authorization (recurring payment)
 * @param {Object} params - Charge parameters
 * @returns {Promise} Charge response
 */
exports.chargeAuthorization = async (params) => {
  try {
    const { email, amount, authorizationCode, reference, metadata = {} } = params;

    const response = await paystackClient.post('/transaction/charge_authorization', {
      email,
      amount,
      authorization_code: authorizationCode,
      reference,
      metadata
    });

    logger.info(`Authorization charged: ${reference}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to charge authorization: ${error.message}`);
    throw new Error(`Charge Error: ${error.response?.data?.message || error.message}`);
  }
};

/**
 * Create a payment plan (for subscriptions)
 * @param {Object} params - Plan parameters
 * @returns {Promise} Plan response
 */
exports.createPlan = async (params) => {
  try {
    const { name, interval, amount, description } = params;

    const response = await paystackClient.post('/plan', {
      name,
      interval, // daily, weekly, monthly, quarterly, biannually, annually
      amount,
      description
    });

    logger.info(`Payment plan created: ${response.data.data.plan_code}`);
    return response.data.data;
  } catch (error) {
    logger.error(`Failed to create payment plan: ${error.message}`);
    throw error;
  }
};

/**
 * Verify webhook signature
 * @param {String} signature - X-Paystack-Signature header value
 * @param {Buffer} payload - Raw request body
 * @returns {Boolean} Signature validity
 */
exports.verifyWebhookSignature = (signature, payload) => {
  const crypto = require('crypto');
  const secret = process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_SECRET_KEY;

  const computedSignature = crypto
    .createHmac('sha512', secret)
    .update(payload)
    .digest('hex');

  return signature === computedSignature;
};

module.exports = exports;
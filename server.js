// server.js
const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const cartRoutes = require('./routes/cartRoutes');
const pageRoutes = require('./routes/pageRoutes');
const beddingRoutes = require('./routes/beddingRoutes');
const decorRoutes = require('./routes/decorRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');


// Import middleware
const { authenticateToken } = require('./middleware/auth');
const { globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// View engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Connect to database
connectDB();

// Trust proxy
app.set('trust proxy', 1);

// Cookie Parser - MUST be before session and helmet
app.use(cookieParser());

// Security middleware with CSP allowing inline scripts
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdnjs.cloudflare.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net",
          "https://checkout.paystack.com"
        ],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.paystack.com"
        ],
        mediaSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://api.paystack.co",
          "http://localhost:5000"
        ]
      }
    }
  })
);

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'uzyhomes-session-secret-2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

// CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Compression
app.use(compression());

// Logging
app.use(morgan('combined', { 
  stream: { 
    write: (message) => logger.info(message.trim()) 
  } 
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api/', limiter);

// Webhook routes MUST be before JSON parsing
app.use('/webhook', webhookRoutes);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Data sanitization
app.use(mongoSanitize());
app.use(authenticateToken);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Apply authentication middleware to all routes
app.use(authenticateToken);

// Make user available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Make session available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});
app.use('/admin', adminRoutes);
// Routes
app.use('/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/bedding', beddingRoutes);
app.use('/products', productRoutes);
app.use('/', pageRoutes);
app.use('/decor', decorRoutes);
app.use('/api/contact', contactRoutes);

// Page routes
app.get('/', (req, res) => {
  res.render('index');
});

app.get('/interiors', (req, res) => {
  res.render('interiors');
});

app.get('/bedding', (req, res) => {
  res.render('bedding');
});

app.get('/portfolio', (req, res) => {
  res.render('portfolio');
});

app.get('/about', (req, res) => {
  res.render('about');
});

app.get('/contact', (req, res) => {
  res.render('contact');
});

app.get('/cart', (req, res) => {
  res.render('cart');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.get('/register', (req, res) => {
  res.render('register');
});

// In server.js, update the account route
app.get('/account', (req, res) => {
  if (!req.user) {
    return res.redirect('/login?redirect=/account');
  }
  
  // Pass query parameters to the view
  res.render('account', { 
    user: req.user,
    query: req.query,
    payment_status: req.query.payment,
    order_id: req.query.order,
    error: req.query.error
  });
});

// TEST ROUTE - Add this temporarily to test redirects
app.get('/test-redirect', (req, res) => {
  console.log('Test redirect called');
  res.redirect('/account?payment=success&order=test123');
});

// ============ PAYMENT VERIFICATION ROUTE (DIRECT) ============
// This handles Paystack's callback directly
app.get('/payment/verify', async (req, res, next) => {
  console.log('💰 DIRECT PAYMENT VERIFICATION CALLED');
  console.log('Query:', req.query);
  
  try {
    const { reference, trxref } = req.query;
    const paymentReference = reference || trxref;

    if (!paymentReference) {
      return res.redirect('/payment-failed?error=No reference provided');
    }

    console.log('🔍 Looking for payment with reference:', paymentReference);
    
    // Find payment
    const Payment = require('./models/Payment');
    const payment = await Payment.findOne({ reference: paymentReference }).populate('order');
    
    if (!payment) {
      console.log('❌ Payment not found for reference:', paymentReference);
      return res.redirect('/payment-failed?error=Payment not found');
    }

    console.log('✅ Payment found, verifying with Paystack...');

    // Verify with Paystack
    const paystackService = require('./services/paystackService');
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
    const Order = require('./models/Order');
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
    console.error('❌ Fatal error in payment verification:', error);
    
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';
    return res.redirect(`${frontendUrl}/payment-failed?error=${encodeURIComponent(error.message)}`);
  }
});

// Payment success page
app.get('/payment-success', (req, res) => {
  res.render('payment-success', { 
    query: req.query,
    user: req.user 
  });
});

// Payment failed page
app.get('/payment-failed', (req, res) => {
  res.render('payment-failed', { 
    query: req.query,
    user: req.user 
  });
});

app.get('/orders', (req, res) => {
  if (!req.user) {
    return res.redirect('/login?redirect=/orders');
  }
  res.render('orders');
});

// TEST REDIRECT ROUTE
app.get('/test-redirect', (req, res) => {
  console.log('🧪 Test redirect called');
  console.log('Redirecting to /payment-success?order=test123');
  res.redirect('/payment-success?order=test123');
});

// TEST JSON RESPONSE
app.get('/test-json', (req, res) => {
  console.log('🧪 Test JSON called');
  res.json({ success: true, message: 'Test JSON response' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    service: 'UZYHOMES Backend',
    user: req.user ? 'authenticated' : 'guest'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404');
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 UZYHOMES Backend Server`);
  logger.info(`✅ Running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📦 Database: MongoDB`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`❌ Unhandled Rejection: ${err.message}`);
  logger.error(err.stack);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  process.exit(1);
});

module.exports = app;
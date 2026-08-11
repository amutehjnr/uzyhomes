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
const flash = require('connect-flash');
const MongoStore = require('connect-mongo');

const connectDB = require('./config/database');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const cartRoutes = require('./routes/cartRoutes');
const pageRoutes = require('./routes/pageRoutes');
const contactRoutes = require('./routes/contactRoutes');
const adminRoutes = require('./routes/adminRoutes');
const blogRoutes = require('./routes/blog');

const wishlistController = require('./controllers/wishlistController');
const orderController = require('./controllers/orderController');
const paymentController = require('./controllers/paymentController');
const authController = require('./controllers/authController');
const addressController = require('./controllers/addressController');
const productController = require('./controllers/productController');
const searchRoutes = require('./routes/searchRoutes');

const { authenticateToken } = require('./middleware/auth');
const { globalErrorHandler } = require('./middleware/errorHandler');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 5000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

connectDB();

app.set('trust proxy', 1);

app.use(cookieParser());

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://checkout.paystack.com"],
        scriptSrcAttr: ["'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https://*.paystack.com", "https://res.cloudinary.com"],
        mediaSrc: ["'self'", "https://res.cloudinary.com"],
        connectSrc: ["'self'", "https://api.paystack.co", "http://localhost:5000"]
      }
    }
  })
);

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,

  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 7 * 24 * 60 * 60
  }),

  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));

app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));
app.use(flash());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: 'Too many requests from this IP, please try again later' });
app.use('/api/', limiter);

// Webhooks MUST be before JSON parsing
app.use('/webhook', webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(mongoSanitize());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

app.use(authenticateToken);

app.use((req, res, next) => {
  res.locals.user = req.user || null;
  res.locals.isLoggedIn = !!req.user;
  next();
});

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ── Core routes ──
app.use('/admin', adminRoutes);
app.use('/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/products', productRoutes);
app.use('/api/contact', contactRoutes);
app.use('/', blogRoutes);
app.use('/', pageRoutes);
app.use('/api/search', searchRoutes);

// Search page route
app.get('/search', (req, res) => res.render('search', { query: req.query.q || '', total: 0, user: req.user || null }));

// Redirect old URLs so existing links don't 404
app.get('/bedding', productController.getBeddingPage);
app.get('/decor', productController.getDecorPage);

// ── User account API routes ──
app.get('/api/addresses',        authenticateToken, addressController.getAddresses);
app.put('/api/addresses',        authenticateToken, addressController.updateAddress);
app.delete('/api/addresses',     authenticateToken, addressController.deleteAddress);

app.get('/api/wishlist',             authenticateToken, wishlistController.getWishlist);
app.post('/api/wishlist',            authenticateToken, wishlistController.addToWishlist);
app.delete('/api/wishlist/:itemId',  authenticateToken, wishlistController.removeFromWishlist);
app.delete('/api/wishlist',          authenticateToken, wishlistController.clearWishlist);

app.get('/api/orders',     authenticateToken, orderController.getOrders);
app.get('/api/orders/:id', authenticateToken, orderController.getOrderById);

app.get('/api/payments',     authenticateToken, paymentController.getUserPayments);
app.get('/api/payments/:id', authenticateToken, paymentController.getPaymentDetails);

app.get('/api/auth/me',               authenticateToken, authController.getMe);
app.put('/api/auth/profile',          authenticateToken, authController.updateProfile);
app.post('/api/auth/change-password', authenticateToken, authController.changePassword);

// ── Page routes ──
app.get('/orders/:id', (req, res) => {
  if (!req.user) return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  res.render('order-details', { user: req.user, orderId: req.params.id });
});

app.get('/orders', (req, res) => {
  if (!req.user) return res.redirect('/login?redirect=/orders');
  res.render('orders');
});

app.get('/transactions/:id', (req, res) => {
  if (!req.user) return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
  res.render('transaction-details', { user: req.user, transactionId: req.params.id });
});

app.get('/', (req, res) => res.render('index'));
app.get('/furniture', productController.getFurniturePage);

app.get('/interiors',         (req, res) => res.render('interiors'));
app.get('/portfolio',         (req, res) => res.render('portfolio'));
app.get('/about',             (req, res) => res.render('about'));
app.get('/contact',           (req, res) => res.render('contact'));
app.get('/cart',              (req, res) => res.render('cart'));
app.get('/login',             (req, res) => res.render('login'));
app.get('/register',          (req, res) => res.render('register'));
app.get('/nature-collection', (req, res) => res.render('nature-collection'));

app.get('/account', (req, res) => {
  if (!req.user) return res.redirect('/login?redirect=/account');
  res.render('account', {
    user: req.user,
    query: req.query,
    payment_status: req.query.payment,
    order_id: req.query.order,
    error: req.query.error
  });
});

// ── Payment verification ──
app.get('/payment/verify', async (req, res) => {
  try {
    const { reference, trxref } = req.query;
    const paymentReference = reference || trxref;
    if (!paymentReference) return res.redirect('/payment-failed?error=No reference provided');

    const Payment = require('./models/Payment');
    const payment = await Payment.findOne({ reference: paymentReference }).populate('order');
    if (!payment) return res.redirect('/payment-failed?error=Payment not found');

    const paystackService = require('./services/paystackService');
    const verificationData = await paystackService.verifyTransaction(paymentReference);

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

    const Order = require('./models/Order');
    const order = await Order.findById(payment.order);
    if (order) {
      if (verificationData.status === 'success') {
        order.paymentStatus = 'completed';
        order.orderStatus = 'confirmed';
        order.paymentDetails = { ...order.paymentDetails, transactionId: verificationData.id, paidAt: verificationData.paid_at, channel: verificationData.channel };
        order.statusHistory.push({ status: 'payment_completed', timestamp: new Date(), note: `Payment completed via ${verificationData.channel}` });
      } else {
        order.paymentStatus = 'failed';
        order.statusHistory.push({ status: 'payment_failed', timestamp: new Date(), note: `Payment failed: ${verificationData.gateway_response || 'Unknown error'}` });
      }
      await order.save();
    }

    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';
    if (verificationData.status === 'success') {
      return res.redirect(`${frontendUrl}/payment-success?order=${order._id}`);
    } else {
      return res.redirect(`${frontendUrl}/payment-failed?order=${order._id}&error=${encodeURIComponent(verificationData.gateway_response || 'Payment failed')}`);
    }
  } catch (error) {
    const frontendUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://localhost:5000';
    return res.redirect(`${frontendUrl}/payment-failed?error=${encodeURIComponent(error.message)}`);
  }
});

app.get('/payment-success', (req, res) => res.render('payment-success', { query: req.query, user: req.user }));
app.get('/payment-failed',  (req, res) => res.render('payment-failed',  { query: req.query, user: req.user }));

app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date(), service: 'UZYHOMES Backend', user: req.user ? 'authenticated' : 'guest' }));

app.use((req, res) => res.status(404).render('404'));
app.use(globalErrorHandler);

const server = app.listen(PORT, () => {
  logger.info(`🚀 UZYHOMES Backend Server`);
  logger.info(`✅ Running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`📦 Database: MongoDB`);
});

process.on('unhandledRejection', (err) => {
  logger.error(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;
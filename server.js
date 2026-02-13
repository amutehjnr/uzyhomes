const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session'); // Add this
require('dotenv').config();
const { authenticateToken } = require('./middleware/auth');
const beddingRoutes = require('./routes/beddingRoutes');

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



// Import middleware
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

// Security middleware
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
        imgSrc: [
          "'self'",
          "data:"
        ],
        mediaSrc: [
          "'self'"
        ],
        connectSrc: [
          "'self'",
          "https://api.paystack.co"
        ]
      }
    }
  })
);

// ============ SIMPLE SESSION SETUP - NO MONGOSTORE ============
// This works immediately without any additional packages
app.use(session({
  secret: process.env.SESSION_SECRET || 'uzyhomes-secret-key-2024',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: false, // Set to true only if using HTTPS
    sameSite: 'lax'
  }
}));
// =============================================================

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

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Make user available to all views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Make session available to all views
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// ============ FIXED AUTHENTICATION ============
// Remove these problematic lines:
// app.use('/api', authenticateToken);
// app.use('*', authenticateToken);

// Instead, protect specific routes in their respective route files
// ==============================================

// Routes
app.use('/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use('/bedding', beddingRoutes)
app.use('/products', productRoutes);
app.use('/', pageRoutes);  // This will handle /product/:id

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

app.get('/decor', (req, res) => {
  res.render('decor');
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

app.get('/account', (req, res) => {
  res.render('account');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date(),
    service: 'UZYHOMES Backend'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use(globalErrorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 UZYHOMES Backend Server`);
  logger.info(`✅ Running on http://localhost:${PORT}`);
  logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💳 Payment Gateway: Paystack`);
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
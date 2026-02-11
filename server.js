const express = require('express');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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

        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdn.jsdelivr.net"
        ],

        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com"
        ],

        imgSrc: [
          "'self'",
          "data:",
          "https:"
        ],

        mediaSrc: [
          "'self'",
          "https:"
        ],

        connectSrc: ["'self'"]
      }
    }
  })
);


// Compression
app.use(compression());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.engine('ejs', require('ejs').renderFile);

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

app.get('/bedding', (req, res) => {
    res.render('bedding');
});

app.get('/interiors', (req, res) => {
    res.render('interiors');
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

// Contact form API
app.post('/api/contact', (req, res) => {
    const { name, email, message, service } = req.body;
    
    // Here you would integrate with nodemailer
    console.log('Contact form submission:', { name, email, message, service });
    
    // Simulate email sending
    res.json({ 
        success: true, 
        message: 'Thank you for your message. We will respond within 24 hours.' 
    });
});

// Newsletter subscription
app.post('/api/newsletter', (req, res) => {
    const { email } = req.body;
    
    // Here you would integrate with Mailchimp or similar
    console.log('Newsletter subscription:', email);
    
    res.json({ 
        success: true, 
        message: 'Thank you for subscribing to UZYHOMES.' 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('404');
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`UZYHOMES server running on http://localhost:${PORT}`);
});
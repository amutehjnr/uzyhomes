// scripts/seed-decor-products.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config();

const decorProducts = [
  // Vases & Vessels
  {
    name: 'Stone Vase',
    slug: 'stone-vase',
    description: 'Handcrafted ceramic vase with textured finish. 25cm height. Each piece is unique with subtle variations in texture and tone.',
    category: 'decor',
    subcategory: 'vases',
    price: 18500,
    images: [{ url: '/images/decor/vase-1.jpg', publicId: 'decor-vase-1' }],
    thumbnail: { url: '/images/decor/vase-1.jpg', publicId: 'decor-vase-1' },
    stock: 12,
    sku: 'DEC-VAS-001',
    specifications: {
      material: 'ceramic',
      color: 'Stone Gray',
      size: '25cm height',
      dimensions: { height: 25, width: 15, unit: 'cm' },
      care: 'Wipe with soft dry cloth'
    },
    rating: 4.7,
    reviewCount: 8,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Clay Urn',
    slug: 'clay-urn',
    description: 'Organic-shaped urn with matte finish. Perfect for dried arrangements or as a standalone sculptural piece.',
    category: 'decor',
    subcategory: 'vases',
    price: 22000,
    images: [{ url: '/images/decor/vase-2.jpg', publicId: 'decor-vase-2' }],
    thumbnail: { url: '/images/decor/vase-2.jpg', publicId: 'decor-vase-2' },
    stock: 8,
    sku: 'DEC-VAS-002',
    specifications: {
      material: 'clay',
      color: 'Terracotta',
      size: '30cm height',
      dimensions: { height: 30, width: 20, unit: 'cm' },
      care: 'Wipe with soft dry cloth'
    },
    rating: 4.5,
    reviewCount: 5,
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Glazed Vessel',
    slug: 'glazed-vessel',
    description: 'Subtle ash glaze with irregular form. 20cm diameter. Modern minimalist design.',
    category: 'decor',
    subcategory: 'vases',
    price: 25000,
    images: [{ url: '/images/decor/vase-3.jpg', publicId: 'decor-vase-3' }],
    thumbnail: { url: '/images/decor/vase-3.jpg', publicId: 'decor-vase-3' },
    stock: 6,
    sku: 'DEC-VAS-003',
    specifications: {
      material: 'ceramic',
      color: 'Ash Gray',
      size: '20cm diameter',
      dimensions: { height: 18, width: 20, unit: 'cm' },
      care: 'Wipe with soft dry cloth'
    },
    rating: 4.8,
    reviewCount: 4,
    isActive: true,
    isFeatured: true
  },

  // Candles & Diffusers
  {
    name: 'Sandalwood & Amber Candle',
    slug: 'sandalwood-amber-candle',
    description: 'Warm, woody, grounding scent. 60-hour burn time. Coconut wax blend in ceramic vessel.',
    category: 'decor',
    subcategory: 'candles',
    price: 15000,
    images: [{ url: '/images/decor/candle-1.jpg', publicId: 'decor-candle-1' }],
    thumbnail: { url: '/images/decor/candle-1.jpg', publicId: 'decor-candle-1' },
    stock: 20,
    sku: 'DEC-CAN-001',
    specifications: {
      material: 'coconut wax',
      color: 'Natural',
      scent: 'Sandalwood & Amber',
      burnTime: '60 hours',
      care: 'Trim wick before each use'
    },
    rating: 4.9,
    reviewCount: 15,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Linen & Lavender Candle',
    slug: 'linen-lavender-candle',
    description: 'Fresh, clean, relaxing scent. 60-hour burn time. Soy wax blend in glass vessel.',
    category: 'decor',
    subcategory: 'candles',
    price: 15000,
    images: [{ url: '/images/decor/candle-2.jpg', publicId: 'decor-candle-2' }],
    thumbnail: { url: '/images/decor/candle-2.jpg', publicId: 'decor-candle-2' },
    stock: 18,
    sku: 'DEC-CAN-002',
    specifications: {
      material: 'soy wax',
      color: 'White',
      scent: 'Linen & Lavender',
      burnTime: '60 hours',
      care: 'Trim wick before each use'
    },
    rating: 4.7,
    reviewCount: 12,
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Fig & Vetiver Diffuser',
    slug: 'fig-vetiver-diffuser',
    description: 'Earthy, green, sophisticated scent. Lasts 3-4 months. Includes natural rattan reeds.',
    category: 'decor',
    subcategory: 'candles',
    price: 28000,
    images: [{ url: '/images/decor/diffuser-1.jpg', publicId: 'decor-diffuser-1' }],
    thumbnail: { url: '/images/decor/diffuser-1.jpg', publicId: 'decor-diffuser-1' },
    stock: 10,
    sku: 'DEC-DIF-001',
    specifications: {
      material: 'essential oils',
      color: 'Amber',
      scent: 'Fig & Vetiver',
      volume: '200ml',
      care: 'Flip reeds weekly for optimal fragrance'
    },
    rating: 4.6,
    reviewCount: 7,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Sea Salt & Sage Candle',
    slug: 'sea-salt-sage-candle',
    description: 'Coastal, herbal, cleansing scent. 60-hour burn time. Coconut wax blend.',
    category: 'decor',
    subcategory: 'candles',
    price: 15000,
    images: [{ url: '/images/decor/candle-3.jpg', publicId: 'decor-candle-3' }],
    thumbnail: { url: '/images/decor/candle-3.jpg', publicId: 'decor-candle-3' },
    stock: 15,
    sku: 'DEC-CAN-003',
    specifications: {
      material: 'coconut wax',
      color: 'Sea Green',
      scent: 'Sea Salt & Sage',
      burnTime: '60 hours',
      care: 'Trim wick before each use'
    },
    rating: 4.8,
    reviewCount: 9,
    isActive: true,
    isFeatured: false
  },

  // Art & Wall Decor
  {
    name: 'Horizon Line',
    slug: 'horizon-line-print',
    description: 'Archival print on cotton paper, 40x50cm. Limited edition of 50. Signed and numbered.',
    category: 'decor',
    subcategory: 'art',
    price: 45000,
    images: [{ url: '/images/decor/art-1.jpg', publicId: 'decor-art-1' }],
    thumbnail: { url: '/images/decor/art-1.jpg', publicId: 'decor-art-1' },
    stock: 5,
    sku: 'DEC-ART-001',
    specifications: {
      material: 'cotton paper',
      artist: 'Lara Okunubi',
      size: '40x50cm',
      framed: false,
      care: 'Keep out of direct sunlight'
    },
    rating: 4.9,
    reviewCount: 3,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Quiet Moment',
    slug: 'quiet-moment-print',
    description: 'Giclée print, 50x70cm, edition of 100. Archival quality, signed by artist.',
    category: 'decor',
    subcategory: 'art',
    price: 65000,
    images: [{ url: '/images/decor/art-2.jpg', publicId: 'decor-art-2' }],
    thumbnail: { url: '/images/decor/art-2.jpg', publicId: 'decor-art-2' },
    stock: 8,
    sku: 'DEC-ART-002',
    specifications: {
      material: 'archival paper',
      artist: 'Femi Adeyemi',
      size: '50x70cm',
      framed: false,
      care: 'Keep out of direct sunlight'
    },
    rating: 4.8,
    reviewCount: 4,
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Soft Geometry',
    slug: 'soft-geometry-print',
    description: 'Screen print, 60x60cm, signed by artist. Limited edition of 25.',
    category: 'decor',
    subcategory: 'art',
    price: 85000,
    images: [{ url: '/images/decor/art-3.jpg', publicId: 'decor-art-3' }],
    thumbnail: { url: '/images/decor/art-3.jpg', publicId: 'decor-art-3' },
    stock: 3,
    sku: 'DEC-ART-003',
    specifications: {
      material: 'archival paper',
      artist: 'Zainab Yusuf',
      size: '60x60cm',
      framed: false,
      care: 'Keep out of direct sunlight'
    },
    rating: 5.0,
    reviewCount: 2,
    isActive: true,
    isFeatured: true
  },

  // Textiles & Throws
  {
    name: 'Woven Throw - Natural',
    slug: 'woven-throw-natural',
    description: 'Hand-woven cotton throw with fringe details. 130x170cm. Versatile for sofa or bed.',
    category: 'decor',
    subcategory: 'textiles',
    price: 32000,
    images: [{ url: '/images/decor/throw-1.jpg', publicId: 'decor-throw-1' }],
    thumbnail: { url: '/images/decor/throw-1.jpg', publicId: 'decor-throw-1' },
    stock: 12,
    sku: 'DEC-TEX-001',
    specifications: {
      material: 'cotton',
      color: 'Natural',
      size: '130x170cm',
      care: 'Hand wash cold, lay flat to dry'
    },
    rating: 4.6,
    reviewCount: 6,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Lumbar Cushion - Terracotta',
    slug: 'lumbar-cushion-terracotta',
    description: 'Velvet lumbar cushion with piped edge. 30x50cm. Adds color and texture.',
    category: 'decor',
    subcategory: 'textiles',
    price: 18500,
    images: [{ url: '/images/decor/cushion-1.jpg', publicId: 'decor-cushion-1' }],
    thumbnail: { url: '/images/decor/cushion-1.jpg', publicId: 'decor-cushion-1' },
    stock: 15,
    sku: 'DEC-TEX-002',
    specifications: {
      material: 'velvet',
      color: 'Terracotta',
      size: '30x50cm',
      care: 'Spot clean only'
    },
    rating: 4.5,
    reviewCount: 4,
    isActive: true,
    isFeatured: false
  },

  // Lighting
  {
    name: 'Ceramic Table Lamp',
    slug: 'ceramic-table-lamp',
    description: 'Hand-thrown ceramic base with linen shade. Warm ambient light.',
    category: 'decor',
    subcategory: 'lighting',
    price: 65000,
    images: [{ url: '/images/decor/lamp-1.jpg', publicId: 'decor-lamp-1' }],
    thumbnail: { url: '/images/decor/lamp-1.jpg', publicId: 'decor-lamp-1' },
    stock: 6,
    sku: 'DEC-LIT-001',
    specifications: {
      material: 'ceramic, linen',
      color: 'White',
      size: '50cm height',
      bulbType: 'E27 LED',
      care: 'Wipe with dry cloth'
    },
    rating: 4.7,
    reviewCount: 5,
    isActive: true,
    isFeatured: true
  },

  // Mirrors
  {
    name: 'Organic Wall Mirror',
    slug: 'organic-wall-mirror',
    description: 'Irregular shape with natural oak frame. 60x80cm. Creates visual interest.',
    category: 'decor',
    subcategory: 'mirrors',
    price: 55000,
    images: [{ url: '/images/decor/mirror-1.jpg', publicId: 'decor-mirror-1' }],
    thumbnail: { url: '/images/decor/mirror-1.jpg', publicId: 'decor-mirror-1' },
    stock: 4,
    sku: 'DEC-MIR-001',
    specifications: {
      material: 'oak, glass',
      color: 'Natural wood',
      size: '60x80cm',
      care: 'Clean with glass cleaner'
    },
    rating: 4.8,
    reviewCount: 3,
    isActive: true,
    isFeatured: true
  },

  // Trays & Bowls
  {
    name: 'Marble Serving Tray',
    slug: 'marble-serving-tray',
    description: 'White marble with brass handles. 40x20cm. Elegant for serving or display.',
    category: 'decor',
    subcategory: 'trays',
    price: 28000,
    images: [{ url: '/images/decor/tray-1.jpg', publicId: 'decor-tray-1' }],
    thumbnail: { url: '/images/decor/tray-1.jpg', publicId: 'decor-tray-1' },
    stock: 10,
    sku: 'DEC-TRA-001',
    specifications: {
      material: 'marble, brass',
      color: 'White',
      size: '40x20cm',
      care: 'Wipe with damp cloth'
    },
    rating: 4.6,
    reviewCount: 7,
    isActive: true,
    isFeatured: false
  },

  // Books & Objects
  {
    name: 'Coffee Table Book: Quiet Spaces',
    slug: 'coffee-table-book-quiet-spaces',
    description: 'Hardcover, 240 pages. Beautiful photography of serene interiors.',
    category: 'decor',
    subcategory: 'books',
    price: 35000,
    images: [{ url: '/images/decor/book-1.jpg', publicId: 'decor-book-1' }],
    thumbnail: { url: '/images/decor/book-1.jpg', publicId: 'decor-book-1' },
    stock: 15,
    sku: 'DEC-BOK-001',
    specifications: {
      material: 'paper, hardcover',
      pages: 240,
      size: '25x30cm',
      care: 'Keep dry'
    },
    rating: 4.9,
    reviewCount: 8,
    isActive: true,
    isFeatured: true
  }
];

const seedDecorProducts = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      authSource: 'admin'
    });
    
    console.log('✅ Connected to MongoDB');
    console.log('📊 Database:', mongoose.connection.db.databaseName);

    // Clear existing decor products
    const deleteResult = await Product.deleteMany({ category: 'decor' });
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing decor products`);

    // Insert one by one
    let successCount = 0;
    for (const product of decorProducts) {
      try {
        const newProduct = new Product(product);
        await newProduct.save();
        console.log(`✅ Added: ${product.name} (${product.subcategory})`);
        successCount++;
      } catch (err) {
        console.log(`❌ Failed: ${product.name} - ${err.message}`);
      }
    }

    console.log(`\n✨ Successfully added ${successCount}/${decorProducts.length} decor products`);
    
    // Verify by subcategory
    const counts = {};
    const results = await Product.find({ category: 'decor' });
    results.forEach(p => {
      counts[p.subcategory] = (counts[p.subcategory] || 0) + 1;
    });
    
    console.log('\n📦 Products by subcategory:');
    Object.entries(counts).forEach(([subcat, count]) => {
      console.log(`   ${subcat}: ${count}`);
    });
    
    const total = await Product.countDocuments({ category: 'decor' });
    console.log(`\n📦 Total decor products in database: ${total}`);
    
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Error seeding products:');
    console.error('Message:', error.message);
    
    if (error.message.includes('ETIMEOUT')) {
      console.error('\n💡 Network timeout!');
      console.error('  1. Go to MongoDB Atlas → Network Access');
      console.error('  2. Add IP address 0.0.0.0/0');
      console.error('  3. Wait 5 minutes and try again');
    }
    
    process.exit(1);
  }
};

seedDecorProducts();
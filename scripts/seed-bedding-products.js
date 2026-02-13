// scripts/seed-bedding-products.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config();

const beddingProducts = [
  {
    name: 'Serenity Bed Set',
    slug: 'serenity-bed-set',
    description: 'Complete bedding set in earthy taupe with subtle texture. Includes duvet cover, fitted sheet, flat sheet, and two pillowcases.',
    category: 'bedding',
    price: 85000,
    images: [{ url: '/images/products/serenity-bed.jpg', publicId: 'serenity-bed' }],
    thumbnail: { url: '/images/products/serenity-bed.jpg', publicId: 'serenity-bed' },
    stock: 15,
    sku: 'BED-SER-001',
    specifications: {
      material: 'organic cotton',
      color: 'Earth Taupe',
      size: 'King',
      care: 'Machine wash cold, tumble dry low, iron on medium'
    },
    rating: 4.8,
    reviewCount: 24,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Cloud Duvet Cover',
    slug: 'cloud-duvet-cover',
    description: '300-thread count, stone-washed for ultimate softness. 100% organic cotton.',
    category: 'bedding',
    price: 62000,
    discountPrice: 58900,
    images: [{ url: '/images/products/cloud-duvet.jpg', publicId: 'cloud-duvet' }],
    thumbnail: { url: '/images/products/cloud-duvet.jpg', publicId: 'cloud-duvet' },
    stock: 20,
    sku: 'BED-CLD-002',
    specifications: {
      material: 'organic cotton',
      color: 'Cloud White',
      size: 'King',
      care: 'Machine wash cold, gentle cycle, line dry'
    },
    rating: 4.9,
    reviewCount: 18,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Stillness Pillows (Set of 2)',
    slug: 'stillness-pillows-set-of-2',
    description: 'Memory foam with organic cotton casing. Medium firmness for optimal neck support.',
    category: 'bedding',
    price: 28000,
    images: [{ url: '/images/products/stillness-pillows.jpg', publicId: 'stillness-pillows' }],
    thumbnail: { url: '/images/products/stillness-pillows.jpg', publicId: 'stillness-pillows' },
    stock: 30,
    sku: 'BED-STL-003',
    specifications: {
      material: 'organic cotton',
      color: 'Ivory',
      size: 'Standard',
      care: 'Spot clean only, use pillow protector'
    },
    rating: 4.7,
    reviewCount: 32,
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Earth Sheet Set',
    slug: 'earth-sheet-set',
    description: 'Organic cotton, deep pocket sheets in olive green. Set includes fitted sheet, flat sheet, and two pillowcases.',
    category: 'bedding',
    price: 45000,
    discountPrice: 42500,
    images: [{ url: '/images/products/earth-sheet-set.jpg', publicId: 'earth-sheet-set' }],
    thumbnail: { url: '/images/products/earth-sheet-set.jpg', publicId: 'earth-sheet-set' },
    stock: 18,
    sku: 'BED-ERT-004',
    specifications: {
      material: 'organic cotton',
      color: 'Olive Green',
      size: 'Queen',
      care: 'Machine wash warm, tumble dry medium, iron if needed'
    },
    rating: 4.6,
    reviewCount: 15,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Moss Throw Blanket',
    slug: 'moss-throw-blanket',
    description: 'Chunky knit, 100% organic wool in forest green. Perfect for adding texture and warmth.',
    category: 'bedding',
    price: 38000,
    images: [{ url: '/images/products/moss-throw.jpg', publicId: 'moss-throw' }],
    thumbnail: { url: '/images/products/moss-throw.jpg', publicId: 'moss-throw' },
    stock: 12,
    sku: 'BED-MOS-005',
    specifications: {
      material: 'wool',
      color: 'Forest Green',
      size: '130x170cm',
      care: 'Dry clean only'
    },
    rating: 4.5,
    reviewCount: 9,
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Stone Bedskirt',
    slug: 'stone-bedskirt',
    description: 'Linen blend with subtle pleating for elegant finish. Fits most bed frames.',
    category: 'bedding',
    price: 32000,
    images: [{ url: '/images/products/stone-bedskirt.jpg', publicId: 'stone-bedskirt' }],
    thumbnail: { url: '/images/products/stone-bedskirt.jpg', publicId: 'stone-bedskirt' },
    stock: 14,
    sku: 'BED-STN-006',
    specifications: {
      material: 'linen',
      color: 'Stone Gray',
      size: 'Queen',
      care: 'Machine wash cold, gentle cycle, line dry'
    },
    rating: 4.4,
    reviewCount: 7,
    isActive: true,
    isFeatured: false
  },
  {
    name: 'Linen Duvet Cover',
    slug: 'linen-duvet-cover',
    description: 'Breathable, soft, and timeless. 100% European flax linen.',
    category: 'bedding',
    price: 72000,
    discountPrice: 68000,
    images: [{ url: '/images/collections/linen.jpg', publicId: 'linen-duvet' }],
    thumbnail: { url: '/images/collections/linen.jpg', publicId: 'linen-duvet' },
    stock: 10,
    sku: 'BED-LIN-007',
    specifications: {
      material: 'linen',
      color: 'Natural',
      size: 'King',
      care: 'Machine wash warm, tumble dry low, iron on high'
    },
    rating: 4.8,
    reviewCount: 11,
    isActive: true,
    isFeatured: true
  },
  {
    name: 'Silk Pillowcases (Set of 2)',
    slug: 'silk-pillowcases-set-of-2',
    description: 'Luxurious, smooth, and gentle on skin and hair. 22 momme pure mulberry silk.',
    category: 'bedding',
    price: 45000,
    discountPrice: 42000,
    images: [{ url: '/images/collections/silk.jpg', publicId: 'silk-pillowcases' }],
    thumbnail: { url: '/images/collections/silk.jpg', publicId: 'silk-pillowcases' },
    stock: 25,
    sku: 'BED-SLK-008',
    specifications: {
      material: 'silk',
      color: 'Champagne',
      size: 'Standard',
      care: 'Hand wash cold, lay flat to dry'
    },
    rating: 4.9,
    reviewCount: 22,
    isActive: true,
    isFeatured: true
  }
];

const seedProducts = async () => {
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

    // Clear existing bedding products
    const deleteResult = await Product.deleteMany({ category: 'bedding' });
    console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing bedding products`);

    // Insert one by one
    let successCount = 0;
    for (const product of beddingProducts) {
      try {
        const newProduct = new Product(product);
        await newProduct.save();
        console.log(`✅ Added: ${product.name}`);
        successCount++;
      } catch (err) {
        console.log(`❌ Failed: ${product.name} - ${err.message}`);
      }
    }

    console.log(`\n✨ Successfully added ${successCount}/${beddingProducts.length} bedding products`);
    
    // Verify the products were added
    const count = await Product.countDocuments({ category: 'bedding' });
    console.log(`📦 Total bedding products in database: ${count}`);
    
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

seedProducts();
// scripts/seed-new-products.js
// Run with: node scripts/seed-new-products.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');

dotenv.config();

const newProducts = [
  // WALL ARTWORK
  { name: 'The Crimson Rosette', slug: 'the-crimson-rosette', description: 'A 3D tactile work with an ombre effect, transitioning from a fiery red corner to a soft ivory base.', category: 'wall artwork', subcategory: 'wall frame', price: 775500, images: [{ url: '/images/products/crimson-rosette.jpg', publicId: 'crimson-rosette' }], thumbnail: { url: '/images/products/crimson-rosette.jpg', publicId: 'crimson-rosette' }, stock: 5, sku: 'ART-CRM-001', specifications: { material: 'mixed media', size: '80x80cm', dimensions: { length: 80, width: 80, unit: 'cm' } }, isActive: true, isFeatured: true },
  { name: 'The Terra Tapestry Wall Frame', slug: 'the-terra-tapestry-wall-frame', description: 'A geometric textile piece featuring raised wool-like lines and soft, earthy color blocks.', category: 'wall artwork', subcategory: 'wall frame', price: 285000, images: [{ url: '/images/products/terra-tapestry.jpg', publicId: 'terra-tapestry' }], thumbnail: { url: '/images/products/terra-tapestry.jpg', publicId: 'terra-tapestry' }, stock: 7, sku: 'ART-TER-002', specifications: { material: 'wool, textile', size: '90x65cm', dimensions: { length: 90, width: 65, unit: 'cm' } }, isActive: true, isFeatured: false },
  { name: 'The Spectrum Curves Wall Frame', slug: 'the-spectrum-curves-wall-frame', description: 'A clean, modern pop-art piece that uses simple curved shapes to create a sense of rhythm made with concrete elements.', category: 'wall artwork', subcategory: 'wall frame', price: 465000, images: [{ url: '/images/products/spectrum-curves.jpg', publicId: 'spectrum-curves' }], thumbnail: { url: '/images/products/spectrum-curves.jpg', publicId: 'spectrum-curves' }, stock: 6, sku: 'ART-SPC-003', specifications: { material: 'concrete, mixed media', size: '70cm x 1.02m', dimensions: { length: 102, width: 70, unit: 'cm' } }, isActive: true, isFeatured: true },
  { name: 'The Unstoppable Mantra Wall Frame', slug: 'the-unstoppable-mantra-wall-frame', description: 'A deconstructed typographic piece designed as a high-impact motivational statement.', category: 'wall artwork', subcategory: 'wall frame', price: 150000, images: [{ url: '/images/products/unstoppable-mantra.jpg', publicId: 'unstoppable-mantra' }], thumbnail: { url: '/images/products/unstoppable-mantra.jpg', publicId: 'unstoppable-mantra' }, stock: 10, sku: 'ART-UNS-004', specifications: { material: 'mixed media, typography', size: '60x40cm', dimensions: { length: 60, width: 40, unit: 'cm' } }, isActive: true, isFeatured: false },
  { name: 'The Azure Core Wall Frame', slug: 'the-azure-core-wall-frame', description: 'An abstract work inspired by the natural "rings" found inside blue agate or geode stones.', category: 'wall artwork', subcategory: 'wall frame', price: 200000, images: [{ url: '/images/products/azure-core.jpg', publicId: 'azure-core' }], thumbnail: { url: '/images/products/azure-core.jpg', publicId: 'azure-core' }, stock: 8, sku: 'ART-AZR-005', specifications: { material: 'mixed media, resin', size: '60x60cm', dimensions: { length: 60, width: 60, unit: 'cm' } }, isActive: true, isFeatured: false },
  { name: 'The Chromatic Bloom Wall Frame', slug: 'the-chromatic-bloom-wall-frame', description: 'A high-energy abstract piece that mimics the wild, messy beauty of a flower in mid-explosion.', category: 'wall artwork', subcategory: 'wall frame', price: 155000, images: [{ url: '/images/products/chromatic-bloom.jpg', publicId: 'chromatic-bloom' }], thumbnail: { url: '/images/products/chromatic-bloom.jpg', publicId: 'chromatic-bloom' }, stock: 9, sku: 'ART-CHR-006', specifications: { material: 'acrylic, mixed media', size: '1.05x1.05m', dimensions: { length: 105, width: 105, unit: 'cm' } }, isActive: true, isFeatured: true },
  { name: 'The Raw Assemblage Wall Frame', slug: 'the-raw-assemblage-wall-frame', description: 'A minimalist collage of burlap, linen, and canvas that focuses on frayed edges and neutral tones.', category: 'wall artwork', subcategory: 'wall frame', price: 365500, images: [{ url: '/images/products/raw-assemblage.jpg', publicId: 'raw-assemblage' }], thumbnail: { url: '/images/products/raw-assemblage.jpg', publicId: 'raw-assemblage' }, stock: 4, sku: 'ART-RAW-007', specifications: { material: 'burlap, linen, canvas', size: '1.35m x 90cm', dimensions: { length: 135, width: 90, unit: 'cm' } }, isActive: true, isFeatured: false },
  { name: 'The Emerald Grid Wall Frame', slug: 'the-emerald-grid-wall-frame', description: 'A grand, multi-dimensional display where deep emerald patinas meet radiant gold leaf. The concentric circular carvings across the sixteen panels create a mesmerizing ripple effect that feels both ancient and avant-garde.', category: 'wall artwork', subcategory: 'wall frame', price: 754000, images: [{ url: '/images/products/emerald-grid.jpg', publicId: 'emerald-grid' }], thumbnail: { url: '/images/products/emerald-grid.jpg', publicId: 'emerald-grid' }, stock: 3, sku: 'ART-EMR-008', specifications: { material: 'gold leaf, emerald patina, wood', size: '1.35m x 90cm', dimensions: { length: 135, width: 90, unit: 'cm' } }, isActive: true, isFeatured: true },
  // VASES
  { name: 'The Alabaster Flow Vase Set', slug: 'the-alabaster-flow-vase-set', description: 'These sculptural vessels celebrate the fluidity of movement. Their crisp, pleated ridges and organic, asymmetrical openings mimic the natural erosion of wind on stone, offering a soft, matte finish that elevates any surface.', category: 'vases', subcategory: 'vases', price: 485000, images: [{ url: '/images/products/alabaster-flow-vase.jpg', publicId: 'alabaster-flow-vase' }], thumbnail: { url: '/images/products/alabaster-flow-vase.jpg', publicId: 'alabaster-flow-vase' }, stock: 6, sku: 'VAS-ALB-001', specifications: { material: 'ceramic, alabaster finish', color: 'Ivory White' }, isActive: true, isFeatured: true },
  { name: 'Ivory Granule Vase Set', slug: 'ivory-granule-vase-set', description: 'These spherical vases are defined by their tactile, "beaded" surface. The uniform, studded texture and creamy off-white hue provide a sophisticated organic contrast to sleek modern furniture.', category: 'vases', subcategory: 'vases', price: 256000, images: [{ url: '/images/products/ivory-granule-vase.jpg', publicId: 'ivory-granule-vase' }], thumbnail: { url: '/images/products/ivory-granule-vase.jpg', publicId: 'ivory-granule-vase' }, stock: 8, sku: 'VAS-IVR-002', specifications: { material: 'ceramic', color: 'Ivory' }, isActive: true, isFeatured: false },
  { name: 'Lucent Layer', slug: 'lucent-layer-smoke-glass-vase', description: 'A masterclass in transparency and poise. This tiered glass vessel features a soft amber-smoke tint and a unique internal shelf, allowing botanicals to appear as if they are suspended in air.', category: 'vases', subcategory: 'vases', price: 190000, images: [{ url: '/images/products/lucent-layer-vase.jpg', publicId: 'lucent-layer-vase' }], thumbnail: { url: '/images/products/lucent-layer-vase.jpg', publicId: 'lucent-layer-vase' }, stock: 10, sku: 'VAS-LCT-003', specifications: { material: 'smoke-tinted glass', color: 'Amber Smoke' }, isActive: true, isFeatured: true },
  // BOWLS AND TRAYS
  { name: 'Obsidian Plisse', slug: 'obsidian-plisse', description: 'A striking study in shadow and light. This centerpiece features sharp, accordion-style fluting in a deep matte black, creating a dramatic, fan-like silhouette that serves as a bold focal point for a minimalist table.', category: 'bowls and trays', subcategory: 'trays', price: 188000, images: [{ url: '/images/products/obsidian-plisse.jpg', publicId: 'obsidian-plisse' }], thumbnail: { url: '/images/products/obsidian-plisse.jpg', publicId: 'obsidian-plisse' }, stock: 7, sku: 'TRY-OBS-001', specifications: { material: 'ceramic, matte black', color: 'Obsidian Black' }, isActive: true, isFeatured: false },
  // BOOKS AND OBJECTS
  { name: 'The Sentinel Wolf Bust', slug: 'the-sentinel-wolf-bust', description: "A powerful, dignified portrayal of wild strength. The dark, charcoal-textured finish is subtly kissed with gold highlights along the fur's edge, creating a piece that feels like a protective guardian for a study or library.", category: 'books and objects', subcategory: 'objects', price: 265000, images: [{ url: '/images/products/sentinel-wolf-bust.jpg', publicId: 'sentinel-wolf-bust' }], thumbnail: { url: '/images/products/sentinel-wolf-bust.jpg', publicId: 'sentinel-wolf-bust' }, stock: 5, sku: 'OBJ-SNT-001', specifications: { material: 'resin, charcoal finish, gold highlights', color: 'Charcoal & Gold' }, isActive: true, isFeatured: true },
  { name: 'Bronze Weave Coffer Jewelry Box Set', slug: 'bronze-weave-coffer-jewelry-box-set', description: 'A marriage of tactile fabric and industrial chic. The rich, chocolate-toned woven exterior is framed by brushed brass edges, making it a warm yet structured sanctuary for watches or fine jewelry.', category: 'books and objects', subcategory: 'objects', price: 392750, images: [{ url: '/images/products/bronze-weave-coffer.jpg', publicId: 'bronze-weave-coffer' }], thumbnail: { url: '/images/products/bronze-weave-coffer.jpg', publicId: 'bronze-weave-coffer' }, stock: 6, sku: 'OBJ-BRZ-002', specifications: { material: 'woven fabric, brushed brass', color: 'Chocolate & Bronze' }, isActive: true, isFeatured: false },
  { name: 'The Jade Keepsake Jewelry Box Set', slug: 'the-jade-keepsake-jewelry-box-set', description: "Dressed in a deep forest-green embossed texture, this trunk features a distinctive hammered metal ring latch. It's a sophisticated storage piece that feels like a modern heirloom found in a luxury boutique.", category: 'books and objects', subcategory: 'objects', price: 290850, images: [{ url: '/images/products/jade-keepsake-box.jpg', publicId: 'jade-keepsake-box' }], thumbnail: { url: '/images/products/jade-keepsake-box.jpg', publicId: 'jade-keepsake-box' }, stock: 7, sku: 'OBJ-JDE-003', specifications: { material: 'embossed leather, hammered metal', color: 'Forest Green' }, isActive: true, isFeatured: true }
];

const seedNewProducts = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4,
      authSource: 'admin'
    });
    console.log('Connected to MongoDB');

    let added = 0, skipped = 0;

    for (const productData of newProducts) {
      try {
        const existing = await Product.findOne({ sku: productData.sku });
        if (existing) {
          console.log('Skipped (exists): ' + productData.name);
          skipped++;
          continue;
        }
        const product = new Product(productData);
        await product.save();
        console.log('Added [' + productData.category + ']: ' + productData.name + ' - N' + productData.price.toLocaleString());
        added++;
      } catch (err) {
        console.log('Failed: ' + productData.name + ' - ' + err.message);
      }
    }

    console.log('\nDone - ' + added + ' added, ' + skipped + ' skipped');

    const categoryCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    console.log('\nAll products by category:');
    categoryCounts.forEach(c => console.log('  ' + c._id + ': ' + c.count));

    await mongoose.disconnect();
    console.log('Done');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

seedNewProducts();
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Product = require('../models/Product');

const migrateCategories = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    let totalUpdated = 0;

    // ==================== BEDDING MIGRATION ====================
    console.log('📋 MIGRATING BEDDING PRODUCTS...');
    
    const beddingUpdates = [
      { keywords: [/sheet/i, /bedsheet/i, /fitted sheet/i, /flat sheet/i], subcategory: 'sheets' },
      { keywords: [/duvet/i, /comforter/i, /doona/i], subcategory: 'duvet' },
      { keywords: [/pillow/i, /cushion/i, /sham/i], subcategory: 'pillows' },
      { keywords: [/towel/i, /bath towel/i, /hand towel/i, /face towel/i], subcategory: 'towels' },
      { keywords: [/throw/i, /blanket/i, /quilt/i, /coverlet/i], subcategory: 'throws' },
      { keywords: [/robe/i, /bathrobe/i, /kimono/i], subcategory: 'robes' }
    ];

    for (const update of beddingUpdates) {
      for (const keyword of update.keywords) {
        const result = await Product.updateMany(
          { 
            category: 'bedding', 
            name: keyword,
            $or: [
              { subcategory: { $exists: false } },
              { subcategory: null },
              { subcategory: '' },
              { subcategory: 'other' }
            ]
          },
          { $set: { subcategory: update.subcategory } }
        );
        if (result.modifiedCount > 0) {
          console.log(`  → Updated ${result.modifiedCount} products to subcategory: ${update.subcategory}`);
          totalUpdated += result.modifiedCount;
        }
      }
    }

    // Update any remaining bedding products without subcategory
    const remainingBedding = await Product.updateMany(
      { 
        category: 'bedding', 
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          { subcategory: '' }
        ]
      },
      { $set: { subcategory: 'other' } }
    );
    if (remainingBedding.modifiedCount > 0) {
      console.log(`  → Set ${remainingBedding.modifiedCount} remaining bedding products to 'other'`);
      totalUpdated += remainingBedding.modifiedCount;
    }

    // ==================== DECOR MIGRATION ====================
    console.log('\n📋 MIGRATING DECOR PRODUCTS...');
    
    const decorUpdates = [
      { keywords: [/vase/i, /vessel/i, /planter/i, /pottery/i, /ceramic/i], subcategory: 'vases' },
      { keywords: [/candle/i, /diffuser/i, /fragrance/i, /scent/i], subcategory: 'candles' },
      { keywords: [/art/i, /print/i, /frame/i, /painting/i, /canvas/i, /poster/i], subcategory: 'art' },
      { keywords: [/bowl/i, /tray/i, /plate/i, /dish/i, /platter/i], subcategory: 'trays' },
      { keywords: [/book/i, /object/i, /sculpture/i, /figurine/i, /decorative/i, /ornament/i], subcategory: 'objects' },
      { keywords: [/textile/i, /throw/i, /blanket/i, /fabric/i, /woven/i], subcategory: 'textiles' },
      { keywords: [/lamp/i, /light/i, /lantern/i, /pendant/i, /table lamp/i], subcategory: 'lighting' },
      { keywords: [/mirror/i, /glass/i], subcategory: 'mirrors' }
    ];

    for (const update of decorUpdates) {
      for (const keyword of update.keywords) {
        const result = await Product.updateMany(
          { 
            category: 'decor', 
            name: keyword,
            $or: [
              { subcategory: { $exists: false } },
              { subcategory: null },
              { subcategory: '' },
              { subcategory: 'other' }
            ]
          },
          { $set: { subcategory: update.subcategory } }
        );
        if (result.modifiedCount > 0) {
          console.log(`  → Updated ${result.modifiedCount} products to subcategory: ${update.subcategory}`);
          totalUpdated += result.modifiedCount;
        }
      }
    }

    // Update any remaining decor products without subcategory
    const remainingDecor = await Product.updateMany(
      { 
        category: 'decor', 
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          { subcategory: '' }
        ]
      },
      { $set: { subcategory: 'other' } }
    );
    if (remainingDecor.modifiedCount > 0) {
      console.log(`  → Set ${remainingDecor.modifiedCount} remaining decor products to 'other'`);
      totalUpdated += remainingDecor.modifiedCount;
    }

    // ==================== WALL ARTWORK MIGRATION ====================
    console.log('\n📋 MIGRATING WALL ARTWORK PRODUCTS...');
    
    const wallArtUpdates = [
      { keywords: [/frame/i, /framed/i, /canvas/i], subcategory: 'wall frame' },
      { keywords: [/sculpture/i, /3d/i, /relief/i, /metal art/i], subcategory: 'sculpture' },
      { keywords: [/print/i, /poster/i, /digital/i, /reproduction/i], subcategory: 'print' }
    ];

    for (const update of wallArtUpdates) {
      for (const keyword of update.keywords) {
        const result = await Product.updateMany(
          { 
            category: 'wall artwork', 
            name: keyword,
            $or: [
              { subcategory: { $exists: false } },
              { subcategory: null },
              { subcategory: '' }
            ]
          },
          { $set: { subcategory: update.subcategory } }
        );
        if (result.modifiedCount > 0) {
          console.log(`  → Updated ${result.modifiedCount} products to subcategory: ${update.subcategory}`);
          totalUpdated += result.modifiedCount;
        }
      }
    }

    // ==================== VASES MIGRATION ====================
    console.log('\n📋 MIGRATING VASES PRODUCTS...');
    
    const result = await Product.updateMany(
      { 
        category: 'vases',
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          { subcategory: '' }
        ]
      },
      { $set: { subcategory: 'vases' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  → Set ${result.modifiedCount} vases products to subcategory: 'vases'`);
      totalUpdated += result.modifiedCount;
    }

    // ==================== BOWLS AND TRAYS MIGRATION ====================
    console.log('\n📋 MIGRATING BOWLS AND TRAYS PRODUCTS...');
    
    const result2 = await Product.updateMany(
      { 
        category: 'bowls and trays',
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          { subcategory: '' }
        ]
      },
      { $set: { subcategory: 'trays' } }
    );
    if (result2.modifiedCount > 0) {
      console.log(`  → Set ${result2.modifiedCount} bowls & trays products to subcategory: 'trays'`);
      totalUpdated += result2.modifiedCount;
    }

    // ==================== BOOKS AND OBJECTS MIGRATION ====================
    console.log('\n📋 MIGRATING BOOKS AND OBJECTS PRODUCTS...');
    
    const result3 = await Product.updateMany(
      { 
        category: 'books and objects',
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          { subcategory: '' }
        ]
      },
      { $set: { subcategory: 'objects' } }
    );
    if (result3.modifiedCount > 0) {
      console.log(`  → Set ${result3.modifiedCount} books & objects products to subcategory: 'objects'`);
      totalUpdated += result3.modifiedCount;
    }

    // ==================== ACCESSORIES MIGRATION ====================
    console.log('\n📋 MIGRATING ACCESSORIES PRODUCTS...');
    
    const result4 = await Product.updateMany(
      { 
        category: 'accessories',
        $or: [
          { subcategory: { $exists: false } },
          { subcategory: null },
          { subcategory: '' }
        ]
      },
      { $set: { subcategory: 'other' } }
    );
    if (result4.modifiedCount > 0) {
      console.log(`  → Set ${result4.modifiedCount} accessories products to subcategory: 'other'`);
      totalUpdated += result4.modifiedCount;
    }

    // ==================== SUMMARY ====================
    console.log('\n' + '='.repeat(50));
    console.log(`✅ MIGRATION COMPLETE!`);
    console.log(`📊 Total products updated: ${totalUpdated}`);
    console.log('='.repeat(50));

    // Show updated counts by category
    console.log('\n📊 UPDATED CATEGORY COUNTS:');
    
    const beddingCount = await Product.countDocuments({ category: 'bedding' });
    const decorCount = await Product.countDocuments({ category: 'decor' });
    const wallArtCount = await Product.countDocuments({ category: 'wall artwork' });
    const vasesCount = await Product.countDocuments({ category: 'vases' });
    const bowlsTraysCount = await Product.countDocuments({ category: 'bowls and trays' });
    const booksObjectsCount = await Product.countDocuments({ category: 'books and objects' });
    const accessoriesCount = await Product.countDocuments({ category: 'accessories' });
    const furnitureCount = await Product.countDocuments({ category: 'furniture' });
    
    console.log(`  Bedding: ${beddingCount}`);
    console.log(`  Decor: ${decorCount}`);
    console.log(`  Wall Artwork: ${wallArtCount}`);
    console.log(`  Vases: ${vasesCount}`);
    console.log(`  Bowls & Trays: ${bowlsTraysCount}`);
    console.log(`  Books & Objects: ${booksObjectsCount}`);
    console.log(`  Accessories: ${accessoriesCount}`);
    console.log(`  Furniture: ${furnitureCount}`);

    // Show subcategory breakdown for bedding
    console.log('\n📊 BEDDING SUBCATEGORIES:');
    const beddingSubcats = await Product.aggregate([
      { $match: { category: 'bedding' } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    beddingSubcats.forEach(cat => {
      console.log(`  ${cat._id || 'null'}: ${cat.count}`);
    });

    // Show subcategory breakdown for decor
    console.log('\n📊 DECOR SUBCATEGORIES:');
    const decorSubcats = await Product.aggregate([
      { $match: { category: 'decor' } },
      { $group: { _id: '$subcategory', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    decorSubcats.forEach(cat => {
      console.log(`  ${cat._id || 'null'}: ${cat.count}`);
    });

    await mongoose.disconnect();
    console.log('\n✅ Database disconnected');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
};

// Run the migration
migrateCategories();
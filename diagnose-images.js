/**
 * force-fix-5-products.js
 * ────────────────────────
 * Directly updates the 5 broken products in MongoDB by uploading
 * images from your local public/videos/ folder (where those product
 * images were stored) or any image file you point it to.
 *
 * Edit the PRODUCT_IMAGES map below with the correct local file paths
 * before running.
 *
 * Run: node force-fix-5-products.js
 */

require('dotenv').config();
const fs         = require('fs');
const path       = require('path');
const mongoose   = require('mongoose');
const cloudinary = require('./config/cloudinary');
const Product    = require('./models/Product');

// ── EDIT THESE to point to the actual image files on your machine ─────────────
// Key = exact product name in MongoDB
// Value = path to the image file (relative to project root or absolute)
const PRODUCT_IMAGES = {
  'The Terra Tapestry Wall Frame':
    'public/images/products/terra-tapestry.jpg',   // update if in a different location

  'The Unstoppable Mantra Wall Frame':
    'public/videos/hero-bg.jpg',                   // update to the correct file

  'Ivory Bloom Signature Set (Luxury Patterned)':
    'public/videos/ivoryluxury.jpg',               // update to the correct file

  'Ivory Bloom Signature Set (White Blue Patterned)':
    'public/videos/ivorywhiteblue.jpg',            // update to the correct file

  'Vurdure Collection':
    'public/videos/Vurdurered.jpg',                // update to the correct file
};
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🔌 Connected to MongoDB\n');

  for (const [productName, imagePath] of Object.entries(PRODUCT_IMAGES)) {
    console.log(`📦 ${productName}`);

    const absolutePath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(process.cwd(), imagePath);

    if (!fs.existsSync(absolutePath)) {
      console.log(`  ❌ File not found: ${absolutePath}`);
      console.log(`     Update the path in PRODUCT_IMAGES and re-run\n`);
      continue;
    }

    try {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(absolutePath, {
        folder: 'uzyhomes/products',
        use_filename: true,
        unique_filename: true,
      });
      console.log(`  ✅ Uploaded: ${result.secure_url}`);

      // Update MongoDB directly
      const updated = await Product.findOneAndUpdate(
        { name: productName },
        { $set: { images: [{ url: result.secure_url, publicId: result.public_id }] } },
        { new: true }
      );

      if (updated) {
        console.log(`  💾 MongoDB updated for: ${updated.name}\n`);
      } else {
        console.log(`  ⚠️  Product not found in DB: "${productName}"\n`);
      }
    } catch (e) {
      console.log(`  ❌ Failed: ${e.message}\n`);
    }
  }

  console.log('🎉 Done! Run diagnose-images.js to verify.');
  await mongoose.disconnect();
})();
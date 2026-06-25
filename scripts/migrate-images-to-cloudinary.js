/**
 * scripts/migrate-images-to-cloudinary.js
 * ─────────────────────────────────────────
 * One-time migration script: uploads all local product and blog images
 * from public/images and public/uploads to Cloudinary, then updates
 * every MongoDB document to point at the new Cloudinary URLs.
 *
 * Usage:
 *   node scripts/migrate-images-to-cloudinary.js
 *
 * Make sure your .env has CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY,
 * CLOUDINARY_API_SECRET, and MONGODB_URI set before running.
 */

require('dotenv').config();
const fs         = require('fs');
const path       = require('path');
const mongoose   = require('mongoose');
const cloudinary = require('../config/cloudinary');

const Product  = require('../models/Product');
const BlogPost = require('../models/BlogPost');

// ── helpers ──────────────────────────────────────────────────────────────────

async function uploadToCloudinary(localPath, folder) {
  const result = await cloudinary.uploader.upload(localPath, {
    folder,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  });
  return { url: result.secure_url, publicId: result.public_id };
}

/** Resolve a relative URL like /images/foo.jpg → absolute local path */
function resolveLocal(urlOrPath) {
  if (!urlOrPath) return null;
  // Already an http URL – skip (already on Cloudinary or external)
  if (urlOrPath.startsWith('http')) return null;
  return path.join(process.cwd(), 'public', urlOrPath);
}

// ── migrate products ──────────────────────────────────────────────────────────

async function migrateProducts() {
  const products = await Product.find({});
  console.log(`\n📦 Migrating ${products.length} products…`);

  let updated = 0;
  for (const product of products) {
    let dirty = false;

    const newImages = [];
    for (const img of (product.images || [])) {
      // If publicId already looks like a Cloudinary path (contains '/'), skip
      if (img.publicId && img.publicId.includes('/')) {
        newImages.push(img);
        continue;
      }
      const localPath = resolveLocal(img.url);
      if (!localPath || !fs.existsSync(localPath)) {
        console.warn(`  ⚠️  File not found, skipping: ${img.url}`);
        newImages.push(img);
        continue;
      }
      try {
        const { url, publicId } = await uploadToCloudinary(localPath, 'uzyhomes/products');
        console.log(`  ✅ ${img.url} → ${url}`);
        newImages.push({ url, publicId });
        dirty = true;
      } catch (e) {
        console.error(`  ❌ Failed to upload ${img.url}:`, e.message);
        newImages.push(img); // keep old value on failure
      }
    }

    if (dirty) {
      product.images = newImages;
      await product.save();
      updated++;
    }
  }
  console.log(`✔  Products migrated: ${updated}/${products.length}`);
}

// ── migrate blog posts ────────────────────────────────────────────────────────

async function migrateBlogPosts() {
  const posts = await BlogPost.find({});
  console.log(`\n📝 Migrating ${posts.length} blog posts…`);

  let updated = 0;
  for (const post of posts) {
    // Already on Cloudinary or has a public_id with folder prefix – skip
    if (
      post.featured_image_public_id?.includes('/') ||
      post.featured_image?.startsWith('http')
    ) continue;

    const localPath = resolveLocal(post.featured_image);
    if (!localPath || !fs.existsSync(localPath)) {
      console.warn(`  ⚠️  File not found, skipping: ${post.featured_image}`);
      continue;
    }
    try {
      const { url, publicId } = await uploadToCloudinary(localPath, 'uzyhomes/blog');
      console.log(`  ✅ ${post.featured_image} → ${url}`);
      post.featured_image           = url;
      post.featured_image_public_id = publicId;
      await post.save();
      updated++;
    } catch (e) {
      console.error(`  ❌ Failed to upload ${post.featured_image}:`, e.message);
    }
  }
  console.log(`✔  Blog posts migrated: ${updated}/${posts.length}`);
}

// ── also upload static public/images & public/videos ─────────────────────────

async function migrateStaticAssets() {
  const dirs = [
    { local: path.join(process.cwd(), 'public/images'), folder: 'uzyhomes/static/images' },
    { local: path.join(process.cwd(), 'public/videos'), folder: 'uzyhomes/static/videos' },
  ];

  for (const { local, folder } of dirs) {
    if (!fs.existsSync(local)) continue;

    const files = fs.readdirSync(local, { withFileTypes: true });
    console.log(`\n🖼  Uploading static assets from ${local}…`);

    for (const dirent of files) {
      if (dirent.isDirectory()) {
        // recurse one level (blog/, decor/, portfolio/ …)
        const subDir   = path.join(local, dirent.name);
        const subFiles = fs.readdirSync(subDir);
        for (const f of subFiles) {
          const filePath = path.join(subDir, f);
          try {
            const r = await cloudinary.uploader.upload(filePath, {
              folder: `${folder}/${dirent.name}`,
              use_filename: true, unique_filename: true, overwrite: false,
            });
            console.log(`  ✅ ${dirent.name}/${f} → ${r.secure_url}`);
          } catch (e) {
            console.error(`  ❌ ${dirent.name}/${f}:`, e.message);
          }
        }
      } else {
        const filePath = path.join(local, dirent.name);
        try {
          const r = await cloudinary.uploader.upload(filePath, {
            folder,
            use_filename: true, unique_filename: true, overwrite: false,
          });
          console.log(`  ✅ ${dirent.name} → ${r.secure_url}`);
        } catch (e) {
          console.error(`  ❌ ${dirent.name}:`, e.message);
        }
      }
    }
  }
}

// ── main ──────────────────────────────────────────────────────────────────────

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('🔌 Connected to MongoDB');

    await migrateProducts();
    await migrateBlogPosts();
    await migrateStaticAssets();

    console.log('\n🎉 Migration complete!');
  } catch (e) {
    console.error('Fatal error:', e);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
})();
// middleware/upload.js
const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ── Ensure upload directories exist ──────────────────────────────────────────
const dirs = [
  'public/uploads',
  'public/uploads/products',
  'public/uploads/blog',
];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Storage config ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination(req, file, cb) {
    // Route-based destination
    if (req.baseUrl.includes('blog') || req.path.includes('blog')) {
      cb(null, 'public/uploads/blog');
    } else {
      cb(null, 'public/uploads/products');
    }
  },
  filename(req, file, cb) {
    const ext      = path.extname(file.originalname).toLowerCase();
    const safeName = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase()
      .slice(0, 40);
    const unique = `${safeName}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
    cb(null, unique);
  },
});

// ── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk   = allowed.test(path.extname(file.originalname).toLowerCase());
  const mimeOk  = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error(`Invalid file type: ${file.originalname}. Only JPEG, PNG, WebP and GIF are allowed.`));
};

// ── Export configured instances ───────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

module.exports = upload;
// middleware/upload.js
const multer  = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// ── Cloudinary storage for product images ────────────────────────────────────
const productStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'uzyhomes/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    public_id: `product-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  }),
});

// ── Cloudinary storage for blog images ───────────────────────────────────────
const blogStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder:         'uzyhomes/blog',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: [{ quality: 'auto', fetch_format: 'auto' }],
    public_id: `blog-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
  }),
});

// ── File filter ───────────────────────────────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const extOk   = allowed.test(file.originalname.toLowerCase());
  const mimeOk  = allowed.test(file.mimetype);
  if (extOk && mimeOk) return cb(null, true);
  cb(new Error(`Invalid file type: ${file.originalname}. Only JPEG, PNG, WebP and GIF are allowed.`));
};

// ── Export configured instances ───────────────────────────────────────────────

/** For product uploads (multi-file: req.files) */
const upload = multer({
  storage:    productStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB (Cloudinary can handle larger)
});

/** For blog uploads (single file: req.file) */
const blogUpload = multer({
  storage:    blogStorage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports         = upload;
module.exports.blog    = blogUpload;
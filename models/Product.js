const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide product name'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Please provide product description']
  },
  category: {
    type: String,
    enum: [
      'bedding',
      'interiors',
      'decor',
      'accessories',
      'wall artwork',
      'vases',
      'bowls and trays',
      'books and objects',
      'furniture'  // ← ADD THIS
    ],
    required: [true, 'Please select a category']
  },
  subcategory: {
    type: String,
    enum: [
      // Decor subcategories
      'art',
      'vases',
      'candles',
      'trays',
      'objects',
      'textiles',
      'lighting',
      'mirrors',
      'books',
      // Wall artwork subcategories
      'wall frame',
      'sculpture',
      'print',
      // Bedding subcategories
      'duvet',
      'sheets',
      'pillows',
      'throws',
      'towels',      // ← ADD THIS
      'robes',       // ← ADD THIS
      'throw blankets', // ← ADD THIS
      // Furniture subcategories
      'sofas',       // ← ADD THIS
      'armchairs',   // ← ADD THIS
      'coffee tables', // ← ADD THIS
      'sideboards',  // ← ADD THIS
      'bookshelves', // ← ADD THIS
      'beds',        // ← ADD THIS
      'dining tables', // ← ADD THIS
      'chairs',      // ← ADD THIS
      'storage',     // ← ADD THIS
      // General
      'other'
    ],
    default: null
  },
  price: {
    type: Number,
    required: [true, 'Please provide price'],
    min: [0, 'Price cannot be negative']
  },
  discountPrice: {
    type: Number,
    validate: {
      validator: function(value) {
        return value < this.price;
      },
      message: 'Discount price must be less than regular price'
    }
  },
  images: [{
    url: String,
    publicId: String
  }],
  thumbnail: {
    url: String,
    publicId: String
  },
  stock: {
    type: Number,
    required: [true, 'Please provide stock quantity'],
    min: [0, 'Stock cannot be negative']
  },
  sku: {
    type: String,
    unique: true,
    required: true
  },
  specifications: {
    material: String,
    color: String,
    size: String,
    subcategory: String,   // kept for backward compatibility with existing seeded data
    artist: String,
    scent: String,
    burnTime: String,
    framed: Boolean,
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      unit: String
    },
    weight: Number,
    care: String,
    // Furniture specific
    assembly: String,      // ← ADD THIS
    warranty: String,      // ← ADD THIS
    style: String          // ← ADD THIS
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  reviewCount: {
    type: Number,
    default: 0
  },
  reviews: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review'
  }],
  vendor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  seoMetadata: {
    metaTitle: String,
    metaDescription: String,
    keywords: [String]
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for search
productSchema.index({ name: 'text', description: 'text', category: 1, price: 1 });

// Auto-generate slug
productSchema.pre('save', function(next) {
  if (!this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
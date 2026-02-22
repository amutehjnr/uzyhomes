const mongoose = require('mongoose');

const blogPostSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, 'Post title is required'],
        trim: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    excerpt: {
        type: String,
        required: [true, 'Post excerpt is required'],
        maxlength: [200, 'Excerpt cannot exceed 200 characters']
    },
    content: {
        type: String,
        required: [true, 'Post content is required']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        enum: ['Interior Design', 'Quiet Luxury', 'Home Styling', 'Behind the Scenes', 'Client Stories']
    },
    category_slug: {
        type: String,
        required: true
    },
    featured_image: {
        type: String,
        required: [true, 'Featured image is required']
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    author_name: {
        type: String,
        required: true
    },
    author_avatar: String,
    publishedAt: {
        type: Date,
        default: Date.now
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    isFeatured: {
        type: Boolean,
        default: false
    },
    isPopular: {
        type: Boolean,
        default: false
    },
    views: {
        type: Number,
        default: 0
    },
    readTime: {
        type: Number,
        min: 1
    },
    tags: [String],
    meta_title: String,
    meta_description: String,
    meta_keywords: [String]
}, {
    timestamps: true
});

// Indexes for better query performance
blogPostSchema.index({ slug: 1 });
blogPostSchema.index({ category_slug: 1 });
blogPostSchema.index({ isPublished: 1, publishedAt: -1 });
blogPostSchema.index({ tags: 1 });

// Generate slug before saving
blogPostSchema.pre('save', function(next) {
    if (!this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
    
    if (!this.category_slug) {
        this.category_slug = this.category
            .toLowerCase()
            .replace(/\s+/g, '-');
    }
    
    // Calculate read time
    if (!this.readTime) {
        const wordsPerMinute = 200;
        const wordCount = this.content.split(/\s+/).length;
        this.readTime = Math.ceil(wordCount / wordsPerMinute);
    }
    
    next();
});

module.exports = mongoose.model('BlogPost', blogPostSchema);
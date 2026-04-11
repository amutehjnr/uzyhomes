// controllers/searchController.js
const Product = require('../models/Product');
const BlogPost = require('../models/BlogPost');
const logger = require('../config/logger');

/**
 * Full-text search across products, blog posts, and pages
 */
exports.search = async (req, res) => {
  try {
    const { q, type, page = 1, limit = 10 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        results: [],
        total: 0,
        query: q || ''
      });
    }

    const query = q.trim();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(query, 'i');

    let results = [];
    let total = 0;

    // ── Products ──────────────────────────────────────────────────────────────
    if (!type || type === 'all' || type === 'products') {
      const productFilter = {
        isActive: true,
        $or: [
          { name: searchRegex },
          { description: searchRegex },
          { category: searchRegex },
          { subcategory: searchRegex },
          { sku: searchRegex },
          { 'specifications.material': searchRegex },
          { 'specifications.color': searchRegex },
          { 'specifications.size': searchRegex },
        ]
      };

      const [products, productCount] = await Promise.all([
        Product.find(productFilter)
          .select('name description category subcategory price discountPrice images stock slug sku')
          .limit(type === 'products' ? parseInt(limit) : 6)
          .skip(type === 'products' ? skip : 0)
          .lean(),
        Product.countDocuments(productFilter)
      ]);

      const productResults = products.map(p => ({
        _id: p._id,
        type: 'Product',
        title: p.name,
        subtitle: p.category + (p.subcategory ? ` › ${p.subcategory}` : ''),
        description: p.description ? p.description.substring(0, 100) + (p.description.length > 100 ? '...' : '') : '',
        price: p.discountPrice || p.price,
        originalPrice: p.discountPrice ? p.price : null,
        image: p.images && p.images[0] ? p.images[0].url : null,
        url: `/product/${p._id}`,
        inStock: p.stock > 0,
        sku: p.sku
      }));

      results = results.concat(productResults);
      total += productCount;
    }

    // ── Blog Posts ─────────────────────────────────────────────────────────────
    if (!type || type === 'all' || type === 'blog') {
      const blogFilter = {
        isPublished: true,
        $or: [
          { title: searchRegex },
          { excerpt: searchRegex },
          { content: searchRegex },
          { category: searchRegex },
          { tags: searchRegex },
          { author_name: searchRegex },
        ]
      };

      const [posts, blogCount] = await Promise.all([
        BlogPost.find(blogFilter)
          .select('title slug excerpt category category_slug featured_image author_name publishedAt tags views')
          .limit(type === 'blog' ? parseInt(limit) : 4)
          .skip(type === 'blog' ? skip : 0)
          .sort({ publishedAt: -1 })
          .lean(),
        BlogPost.countDocuments(blogFilter)
      ]);

      const blogResults = posts.map(p => ({
        _id: p._id,
        type: 'Blog',
        title: p.title,
        subtitle: p.category || 'Blog Post',
        description: p.excerpt ? p.excerpt.substring(0, 120) + (p.excerpt.length > 120 ? '...' : '') : '',
        image: p.featured_image || null,
        url: `/blog/${p.slug}`,
        date: p.publishedAt,
        author: p.author_name,
        tags: p.tags || []
      }));

      results = results.concat(blogResults);
      total += blogCount;
    }

    // ── Static Pages ──────────────────────────────────────────────────────────
    if (!type || type === 'all' || type === 'pages') {
      const staticPages = [
        { title: 'Bedding Collection', description: 'Luxury bedding — sheets, duvets, pillows, towels, throws and robes', url: '/bedding', category: 'Shop', keywords: ['bedding', 'sheets', 'duvet', 'pillow', 'linen', 'cotton', 'luxury bed'] },
        { title: 'Decor Collection', description: 'Curated home décor — wall art, vases, bowls, books & objects', url: '/decor', category: 'Shop', keywords: ['decor', 'wall art', 'vases', 'bowls', 'objects', 'accessories', 'styling'] },
        { title: 'Furniture Collection', description: 'Premium furniture — sofas, armchairs, coffee tables, bookshelves', url: '/furniture', category: 'Shop', keywords: ['furniture', 'sofa', 'armchair', 'table', 'bookshelf', 'sideboard'] },
        { title: 'Interior Design', description: 'Professional interior design services — residential and commercial', url: '/interiors', category: 'Services', keywords: ['interior design', 'interiors', 'design service', 'consultation', 'styling', 'space'] },
        { title: 'Portfolio', description: 'View our completed interior design and styling projects', url: '/portfolio', category: 'About', keywords: ['portfolio', 'projects', 'work', 'case study', 'gallery'] },
        { title: 'About UZYHOMES', description: 'Our story, philosophy, and the people behind UZYHOMES', url: '/about', category: 'About', keywords: ['about', 'story', 'founder', 'team', 'ozzy', 'philosophy'] },
        { title: 'Contact Us', description: 'Book a consultation or get in touch with our team', url: '/contact', category: 'Contact', keywords: ['contact', 'book', 'consultation', 'phone', 'email', 'address', 'whatsapp'] },
        { title: 'Blog', description: 'Design insights, quiet luxury tips, and home inspiration', url: '/blog', category: 'Blog', keywords: ['blog', 'articles', 'tips', 'inspiration', 'design ideas'] },
        { title: 'Shopping Cart', description: 'View and manage your selected items', url: '/cart', category: 'Shop', keywords: ['cart', 'shopping', 'bag', 'checkout'] },
        { title: 'Create Account', description: 'Join UZYHOMES for exclusive member benefits', url: '/register', category: 'Account', keywords: ['register', 'sign up', 'create account', 'join', 'new account'] },
        { title: 'Login', description: 'Sign in to your UZYHOMES account', url: '/login', category: 'Account', keywords: ['login', 'sign in', 'account', 'password'] },
      ];

      const queryLower = query.toLowerCase();
      const matchedPages = staticPages.filter(page =>
        page.title.toLowerCase().includes(queryLower) ||
        page.description.toLowerCase().includes(queryLower) ||
        page.keywords.some(k => k.includes(queryLower) || queryLower.includes(k))
      );

      const pageResults = matchedPages.map(p => ({
        _id: p.url,
        type: 'Page',
        title: p.title,
        subtitle: p.category,
        description: p.description,
        image: null,
        url: p.url
      }));

      results = results.concat(pageResults);
      total += matchedPages.length;
    }

    // ── Sort: products first, then blog, then pages ────────────────────────────
    if (!type || type === 'all') {
      const typeOrder = { Product: 0, Blog: 1, Page: 2 };
      results.sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);
    }

    return res.json({
      success: true,
      results,
      total,
      query,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    logger.error('Search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Search failed. Please try again.',
      results: []
    });
  }
};

/**
 * Quick/autocomplete search — returns fewer results, faster
 */
exports.quickSearch = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.json({ success: true, suggestions: [] });
    }

    const searchRegex = new RegExp(q.trim(), 'i');

    const [products, posts] = await Promise.all([
      Product.find({ isActive: true, name: searchRegex })
        .select('name category price discountPrice images')
        .limit(5)
        .lean(),
      BlogPost.find({ isPublished: true, title: searchRegex })
        .select('title slug category_slug')
        .limit(3)
        .lean()
    ]);

    const suggestions = [
      ...products.map(p => ({
        type: 'Product',
        label: p.name,
        sub: p.category,
        price: `₦${Number(p.discountPrice || p.price).toLocaleString()}`,
        image: p.images?.[0]?.url || null,
        url: `/product/${p._id}`
      })),
      ...posts.map(p => ({
        type: 'Blog',
        label: p.title,
        sub: p.category_slug?.replace(/-/g, ' ') || 'Blog',
        url: `/blog/${p.slug}`
      }))
    ];

    return res.json({ success: true, suggestions, query: q.trim() });

  } catch (error) {
    logger.error('Quick search error:', error);
    return res.json({ success: true, suggestions: [] });
  }
};
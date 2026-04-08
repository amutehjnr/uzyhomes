// controllers/collectionsController.js
const Product = require('../models/Product');
const logger = require('../config/logger');

/**
 * Unified Collections page - merges /bedding and /decor
 */
exports.getCollections = async (req, res, next) => {
    try {
        const {
            page = 1,
            limit = 12,
            sort = 'featured',
            filter = 'all',
            collection,
            category,
            search
        } = req.query;

        const currentPage = parseInt(page);
        const perPage = parseInt(limit);
        const skip = (currentPage - 1) * perPage;

        // Build filter query
        let query = { isActive: true };

        // Category/filter mapping - supports old /bedding and /decor URL params
        const filterMap = {
            bedding: { category: 'bedding' },
            decor: { category: 'decor' },
            interiors: { category: 'interiors' },
            accessories: { category: 'accessories' },
            // Legacy collection slugs from /bedding
            linen: { category: 'bedding', 'specifications.material': /linen/i },
            cotton: { category: 'bedding', 'specifications.material': /cotton/i },
            // Decor subcategories
            vases: { category: 'decor', 'specifications.subcategory': 'vases' },
            candles: { category: 'decor', 'specifications.subcategory': 'candles' },
            art: { category: 'decor', 'specifications.subcategory': 'art' },
        };

        const activeFilter = filter !== 'all' ? filter : (category || collection || null);

        if (activeFilter && filterMap[activeFilter]) {
            Object.assign(query, filterMap[activeFilter]);
        }

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Sort options
        const sortMap = {
            featured: { isFeatured: -1, createdAt: -1 },
            newest: { createdAt: -1 },
            price_low: { price: 1 },
            price_high: { price: -1 },
            rating: { rating: -1 }
        };
        const sortQuery = sortMap[sort] || sortMap.featured;

        // Fetch products
        const [products, total] = await Promise.all([
            Product.find(query).sort(sortQuery).skip(skip).limit(perPage),
            Product.countDocuments(query)
        ]);

        // Fetch featured/top products (3 highest priced, for the hero grid)
        const featuredProducts = await Product.find({ isActive: true, isFeatured: true })
            .sort({ price: -1 })
            .limit(3);

        // Fetch section-specific products
        const [beddingProducts, decorProducts, vaseProducts, candleProducts, artProducts] = await Promise.all([
            Product.find({ isActive: true, category: 'bedding' }).sort({ isFeatured: -1 }).limit(8),
            Product.find({ isActive: true, category: 'decor' }).sort({ isFeatured: -1 }).limit(8),
            Product.find({ isActive: true, 'specifications.subcategory': 'vases' }).limit(4),
            Product.find({ isActive: true, 'specifications.subcategory': 'candles' }).limit(4),
            Product.find({ isActive: true, 'specifications.subcategory': 'art' }).limit(4),
        ]);

        // Bedding collections (from old beddingRoutes)
        const beddingCollections = [
            {
                name: 'Linen Collection',
                slug: 'linen',
                description: 'Breathable, lived-in luxury.',
                image: '/images/collections/linen.jpg',
                count: await Product.countDocuments({ isActive: true, category: 'bedding', 'specifications.material': /linen/i })
            },
            {
                name: 'Cotton Essentials',
                slug: 'cotton',
                description: 'Crisp, classic, enduring comfort.',
                image: '/images/collections/cotton.jpg',
                count: await Product.countDocuments({ isActive: true, category: 'bedding', 'specifications.material': /cotton/i })
            },
            {
                name: 'Quiet Luxury',
                slug: 'bedding',
                description: 'Our full bedding range.',
                image: '/images/collections/ql.jpg',
                count: await Product.countDocuments({ isActive: true, category: 'bedding' })
            }
        ];

        // Decor categories (from old decorRoutes)
        const decorCategories = [
            { name: 'Vases & Vessels', slug: 'vases', icon: 'fa-vial', count: vaseProducts.length },
            { name: 'Scented Candles', slug: 'candles', icon: 'fa-fire', count: candleProducts.length },
            { name: 'Wall Art', slug: 'art', icon: 'fa-image', count: artProducts.length },
            { name: 'All Décor', slug: 'decor', icon: 'fa-couch', count: decorProducts.length },
        ];

        // Decor styling tips (from old decor controller)
        const stylingTips = [
            {
                number: '01',
                title: 'Layer textures intentionally',
                description: 'Mix smooth ceramics with rough linen, matte with gloss. Contrast creates depth without noise.'
            },
            {
                number: '02',
                title: 'Odd numbers feel natural',
                description: 'Group objects in threes or fives. Even numbers feel manufactured; odd numbers feel discovered.'
            },
            {
                number: '03',
                title: 'Vary heights deliberately',
                description: 'Place tall pieces behind medium, small in front. The eye should travel, not stop.'
            }
        ];

        const pagination = {
            currentPage,
            totalPages: Math.ceil(total / perPage),
            total,
            hasNext: currentPage < Math.ceil(total / perPage),
            hasPrev: currentPage > 1,
            nextPage: currentPage + 1,
            prevPage: currentPage - 1
        };

        res.render('collections', {
            title: 'The Collection — UZYHOMES',
            user: req.user || null,

            // Main paginated products
            products,
            allProducts: products,
            pagination,

            // Section products
            featuredProducts,
            beddingProducts,
            decorProducts,
            vaseProducts,
            candleProducts,
            artProducts,

            // Collections/categories metadata
            beddingCollections,
            decorCategories,
            stylingTips,

            // Active filters
            filters: { sort, filter: activeFilter || 'all', collection, category, search },
            filter: activeFilter || 'all'
        });

    } catch (error) {
        logger.error('Collections page error:', error);
        next(error);
    }
};
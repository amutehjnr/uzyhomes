// routes/beddingRoutes.js
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Helper functions for collections
const collections = [
    {
        slug: 'nature',
        name: 'The Nature Collection',
        description: 'Inspired by stillness and earth tones. Designed for complete relaxation.',
        image: '/images/collections/nature.jpg',
        material: 'organic cotton'
    },
    {
        slug: 'linen',
        name: 'The Linen Collection',
        description: 'Breathable, soft, and timeless. Perfect for warm climates and cool comfort.',
        image: '/images/collections/linen.jpg',
        material: 'linen'
    },
    {
        slug: 'silk',
        name: 'The Silk Collection',
        description: 'Luxurious, smooth, and gentle on skin. The ultimate in sleep luxury.',
        image: '/images/collections/silk.jpg',
        material: 'silk'
    }
];

// Get bedding page
router.get('/', async (req, res, next) => {
    try {
        const { sort = 'featured', collection, page = 1, limit = 6 } = req.query;

        // Build filter
        let filter = { 
            category: 'bedding',
            isActive: true 
        };

        // Filter by collection
        if (collection && collection !== 'all') {
            const selectedCollection = collections.find(c => c.slug === collection);
            if (selectedCollection) {
                filter['specifications.material'] = selectedCollection.material;
            }
        }

        // Build sort
        let sortOptions = {};
        switch (sort) {
            case 'price_low':
                sortOptions = { price: 1 };
                break;
            case 'price_high':
                sortOptions = { price: -1 };
                break;
            case 'newest':
                sortOptions = { createdAt: -1 };
                break;
            case 'rating':
                sortOptions = { rating: -1 };
                break;
            default: // featured
                sortOptions = { isFeatured: -1, createdAt: -1 };
        }

        // Pagination
        const skip = (page - 1) * limit;
        
        // Get products
        const products = await Product.find(filter)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('name price discountPrice images description rating reviewCount specifications isFeatured');

        // Get total count
        const total = await Product.countDocuments(filter);

        // Get collection counts
        const collectionsWithCounts = await Promise.all(collections.map(async (col) => {
            const count = await Product.countDocuments({
                category: 'bedding',
                isActive: true,
                'specifications.material': col.material
            });
            return { ...col, count };
        }));

        // Get featured products
        const featuredProducts = await Product.find({ 
            category: 'bedding', 
            isActive: true,
            isFeatured: true 
        })
        .limit(4)
        .select('name price discountPrice images');

        // For AJAX requests
        if (req.query.ajax === 'true') {
            return res.render('partials/product-grid', {
                products,
                layout: false
            });
        }

        res.render('bedding', {
            title: 'Luxury Bedding — UZYHOMES',
            products,
            collections: collectionsWithCounts,
            featuredProducts,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total,
                limit: parseInt(limit)
            },
            filters: {
                sort,
                collection: collection || 'all'
            },
            user: req.user || null,
            isGuest: !req.user,
            // Helper functions for view
            getCollectionName: (slug) => {
                const col = collections.find(c => c.slug === slug);
                return col ? col.name : 'Collection';
            },
            getCollectionDescription: (slug) => {
                const col = collections.find(c => c.slug === slug);
                return col ? col.description : '';
            }
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
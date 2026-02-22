const express = require('express');
const router = express.Router();
const BlogPost = require('../models/BlogPost');
const logger = require('../config/logger');

// Helper function to format date
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Main blog listing page
router.get('/blog', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6; // Posts per page
        const skip = (page - 1) * limit;
        const category = req.query.category || 'all';
        
        // Build filter
        let filter = { isPublished: true };
        if (category !== 'all') {
            filter.category_slug = category;
        }
        
        // Get total count for pagination
        const total = await BlogPost.countDocuments(filter);
        
        // Get posts for current page
        const posts = await BlogPost.find(filter)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'name');
        
        // Get featured post (most recent featured post)
        const featuredPost = await BlogPost.findOne({ 
            isPublished: true, 
            isFeatured: true 
        }).sort({ publishedAt: -1 });
        
        // Get popular posts (by views)
        const popularPosts = await BlogPost.find({ isPublished: true })
            .sort({ views: -1, publishedAt: -1 })
            .limit(3);
        
        // Get categories with counts
        const categories = await BlogPost.aggregate([
            { $match: { isPublished: true } },
            { $group: { 
                _id: { name: '$category', slug: '$category_slug' }, 
                count: { $sum: 1 } 
            }},
            { $sort: { '_id.name': 1 } }
        ]);
        
        // Format categories for template
        const formattedCategories = categories.map(c => ({
            name: c._id.name,
            slug: c._id.slug,
            count: c.count
        }));
        
        // Get all tags
        const allTags = await BlogPost.distinct('tags', { isPublished: true });
        
        // Format posts for template
        const formattedPosts = posts.map(post => ({
            _id: post._id,
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            category: post.category,
            category_slug: post.category_slug,
            image: post.featured_image,
            date: formatDate(post.publishedAt),
            author: post.author_name,
            views: post.views
        }));
        
        // Format featured post if exists
        const formattedFeatured = featuredPost ? {
            title: featuredPost.title,
            slug: featuredPost.slug,
            excerpt: featuredPost.excerpt,
            category: featuredPost.category,
            image: featuredPost.featured_image,
            date: formatDate(featuredPost.publishedAt)
        } : null;
        
        // Format popular posts
        const formattedPopular = popularPosts.map(post => ({
            title: post.title,
            slug: post.slug,
            image: post.featured_image,
            date: formatDate(post.publishedAt)
        }));
        
        res.render('blog', {
            title: 'Blog — UZYHOMES',
            currentPage: 'blog',
            featuredPost: formattedFeatured,
            posts: formattedPosts,
            popularPosts: formattedPopular,
            categories: formattedCategories,
            tags: allTags,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1,
                nextPage: page + 1,
                prevPage: page - 1
            },
            filters: { category },
            user: req.user || null,
            messages: req.flash ? req.flash() : {}
        });
        
    } catch (error) {
        logger.error('Blog listing error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading blog posts',
            user: req.user || null
        });
    }
});

// Single blog post page
router.get('/blog/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Find post and increment views
        const post = await BlogPost.findOneAndUpdate(
            { slug, isPublished: true },
            { $inc: { views: 1 } },
            { new: true }
        ).populate('author', 'name');
        
        if (!post) {
            return res.status(404).render('404', {
                title: 'Post Not Found',
                message: 'The blog post you\'re looking for doesn\'t exist',
                user: req.user || null
            });
        }
        
        // Get related posts (same category, exclude current)
        const relatedPosts = await BlogPost.find({
            category: post.category,
            slug: { $ne: slug },
            isPublished: true
        })
        .sort({ publishedAt: -1 })
        .limit(3)
        .select('title slug featured_image excerpt');
        
        // Format current post
        const formattedPost = {
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            content: post.content,
            category: post.category,
            image: post.featured_image,
            date: formatDate(post.publishedAt),
            author: post.author_name,
            views: post.views,
            readTime: post.readTime,
            tags: post.tags || []
        };
        
        // Format related posts
        const formattedRelated = relatedPosts.map(p => ({
            title: p.title,
            slug: p.slug,
            image: p.featured_image,
            excerpt: p.excerpt.substring(0, 100) + '...'
        }));
        
        res.render('blog-post', {
            title: `${post.title} — UZYHOMES`,
            currentPage: 'blog',
            post: formattedPost,
            relatedPosts: formattedRelated,
            user: req.user || null
        });
        
    } catch (error) {
        logger.error('Blog post error:', error);
        res.status(500).render('error', {
            title: 'Error',
            message: 'Error loading blog post',
            user: req.user || null
        });
    }
});

// Category page (optional - can use same as blog with category filter)
router.get('/blog/category/:category', async (req, res) => {
    try {
        const categorySlug = req.params.category;
        
        // Find the category name from slug
        const categoryMap = {
            'interior-design': 'Interior Design',
            'quiet-luxury': 'Quiet Luxury',
            'home-styling': 'Home Styling',
            'behind-the-scenes': 'Behind the Scenes',
            'client-stories': 'Client Stories'
        };
        
        const categoryName = categoryMap[categorySlug];
        
        if (!categoryName) {
            return res.redirect('/blog');
        }
        
        // Redirect to main blog with category filter
        res.redirect(`/blog?category=${categorySlug}`);
        
    } catch (error) {
        logger.error('Category redirect error:', error);
        res.redirect('/blog');
    }
});

// Tag page
router.get('/blog/tag/:tag', async (req, res) => {
    try {
        const tag = req.params.tag;
        
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (page - 1) * limit;
        
        const filter = { 
            isPublished: true,
            tags: tag 
        };
        
        const total = await BlogPost.countDocuments(filter);
        
        const posts = await BlogPost.find(filter)
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);
        
        const formattedPosts = posts.map(post => ({
            title: post.title,
            slug: post.slug,
            excerpt: post.excerpt,
            category: post.category,
            image: post.featured_image,
            date: formatDate(post.publishedAt)
        }));
        
        res.render('blog-tag', {
            title: `Tag: ${tag} — UZYHOMES`,
            currentPage: 'blog',
            tag,
            posts: formattedPosts,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total,
                hasNext: page < Math.ceil(total / limit),
                hasPrev: page > 1
            },
            user: req.user || null
        });
        
    } catch (error) {
        logger.error('Tag page error:', error);
        res.redirect('/blog');
    }
});

// Newsletter subscription from blog
router.post('/blog/newsletter/subscribe', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            req.flash('error', 'Email is required');
            return res.redirect('/blog');
        }
        
        // You already have a Subscriber model from your previous setup
        const Subscriber = require('../models/Subscriber');
        
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        
        let subscriber = await Subscriber.findOne({ email });
        
        if (subscriber) {
            if (subscriber.status === 'active') {
                req.flash('error', 'This email is already subscribed');
                return res.redirect('/blog');
            } else if (subscriber.status === 'unsubscribed') {
                subscriber.status = 'active';
                subscriber.subscribedAt = new Date();
                await subscriber.save();
                
                req.flash('success', 'Subscription reactivated successfully!');
                return res.redirect('/blog');
            }
        } else {
            subscriber = new Subscriber({
                email,
                source: 'blog',
                ipAddress,
                userAgent
            });
            
            await subscriber.save();
            
            req.flash('success', 'Successfully subscribed to newsletter!');
            return res.redirect('/blog');
        }
        
    } catch (error) {
        logger.error('Blog newsletter error:', error);
        req.flash('error', 'Error subscribing. Please try again.');
        res.redirect('/blog');
    }
});

module.exports = router;
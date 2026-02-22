const BlogPost = require('../models/BlogPost');
const logger = require('../config/logger');
const fs = require('fs');
const path = require('path');

// Get all blog posts (admin view)
exports.getBlogPosts = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const status = req.query.status || 'all';
        const category = req.query.category || 'all';
        
        let filter = {};
        
        if (status === 'published') {
            filter.isPublished = true;
        } else if (status === 'draft') {
            filter.isPublished = false;
        }
        
        if (category !== 'all') {
            filter.category_slug = category;
        }
        
        const posts = await BlogPost.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('author', 'name email avatar');
        
        const total = await BlogPost.countDocuments(filter);
        
        // Get stats
        const stats = {
            total: await BlogPost.countDocuments(),
            published: await BlogPost.countDocuments({ isPublished: true }),
            draft: await BlogPost.countDocuments({ isPublished: false }),
            featured: await BlogPost.countDocuments({ isFeatured: true })
        };
        
        // Get categories with counts
        const categories = await BlogPost.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 }, slug: { $first: '$category_slug' } } },
            { $sort: { _id: 1 } }
        ]);
        
        // FIX: Changed from 'admin/blog/index' to 'admin/blog'
        res.render('admin/blog', {
            title: 'Manage Blog Posts',
            currentPage: 'blog',
            posts,
            stats,
            categories,
            pagination: {
                page,
                totalPages: Math.ceil(total / limit),
                total,
                limit
            },
            filters: { status, category, search: req.query.search || '' },
            user: req.user,
            messages: req.flash ? req.flash() : {}
        });
    } catch (error) {
        logger.error('Get blog posts error:', error);
        req.flash('error', 'Error loading blog posts');
        res.redirect('/admin/dashboard');
    }
};

// New blog post form
exports.newBlogPost = (req, res) => {
    // FIX: Changed from 'admin/blog/edit' to 'admin/blog-edit'
    res.render('admin/blog-edit', {
        title: 'Create New Post',
        currentPage: 'blog',
        post: null,
        categories: [
            'Interior Design',
            'Quiet Luxury',
            'Home Styling',
            'Behind the Scenes',
            'Client Stories'
        ],
        user: req.user,
        messages: req.flash ? req.flash() : {}
    });
};

// Create blog post
exports.createBlogPost = async (req, res) => {
    try {
        const { title, excerpt, content, category, tags, meta_title, meta_description, isPublished, isFeatured } = req.body;
        
        // Validate required fields
        if (!title || !excerpt || !content || !category) {
            req.flash('error', 'All required fields must be filled');
            return res.redirect('/admin/blog/new');
        }
        
        // Check if slug already exists
        const slug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        
        const existingPost = await BlogPost.findOne({ slug });
        if (existingPost) {
            req.flash('error', 'A post with this title already exists');
            return res.redirect('/admin/blog/new');
        }
        
        // Process tags
        const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];
        
        const post = new BlogPost({
            title,
            slug,
            excerpt,
            content,
            category,
            category_slug: category.toLowerCase().replace(/\s+/g, '-'),
            featured_image: req.file ? `/uploads/blog/${req.file.filename}` : null,
            author: req.user._id,
            author_name: req.user.name,
            author_avatar: req.user.avatar,
            tags: tagsArray,
            meta_title: meta_title || title,
            meta_description: meta_description || excerpt,
            publishedAt: new Date(),
            isPublished: isPublished === 'on',
            isFeatured: isFeatured === 'on'
        });
        
        await post.save();
        
        logger.info(`Blog post created: ${title} by ${req.user.email}`);
        req.flash('success', 'Post created successfully!');
        res.redirect('/admin/blog');
        
    } catch (error) {
        logger.error('Create blog post error:', error);
        
        // Delete uploaded image if error
        if (req.file) {
            fs.unlink(path.join(__dirname, '..', 'public', req.file.path), (err) => {
                if (err) logger.error('Error deleting file:', err);
            });
        }
        
        req.flash('error', 'Error creating post: ' + error.message);
        res.redirect('/admin/blog/new');
    }
};

// Edit blog post form
exports.editBlogPost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        
        if (!post) {
            req.flash('error', 'Post not found');
            return res.redirect('/admin/blog');
        }
        
        // FIX: Changed from 'admin/blog/edit' to 'admin/blog-edit'
        res.render('admin/blog-edit', {
            title: 'Edit Post',
            currentPage: 'blog',
            post,
            categories: [
                'Interior Design',
                'Quiet Luxury',
                'Home Styling',
                'Behind the Scenes',
                'Client Stories'
            ],
            user: req.user,
            messages: req.flash ? req.flash() : {}
        });
    } catch (error) {
        logger.error('Edit blog post error:', error);
        req.flash('error', 'Error loading post');
        res.redirect('/admin/blog');
    }
};

// Update blog post
exports.updateBlogPost = async (req, res) => {
    try {
        const { title, excerpt, content, category, tags, meta_title, meta_description, isPublished, isFeatured } = req.body;
        
        const post = await BlogPost.findById(req.params.id);
        if (!post) {
            req.flash('error', 'Post not found');
            return res.redirect('/admin/blog');
        }
        
        // Generate new slug if title changed
        let slug = post.slug;
        if (title !== post.title) {
            slug = title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, '');
            
            // Check if new slug exists
            const existingPost = await BlogPost.findOne({ slug, _id: { $ne: post._id } });
            if (existingPost) {
                req.flash('error', 'A post with this title already exists');
                return res.redirect(`/admin/blog/${post._id}/edit`);
            }
        }
        
        // Process tags
        const tagsArray = tags ? tags.split(',').map(t => t.trim()) : [];
        
        // Update fields
        post.title = title || post.title;
        post.slug = slug;
        post.excerpt = excerpt || post.excerpt;
        post.content = content || post.content;
        post.category = category || post.category;
        post.category_slug = (category || post.category).toLowerCase().replace(/\s+/g, '-');
        post.tags = tagsArray;
        post.meta_title = meta_title || post.meta_title;
        post.meta_description = meta_description || post.meta_description;
        post.isPublished = isPublished === 'on';
        post.isFeatured = isFeatured === 'on';
        
        if (req.file) {
            // Delete old image
            if (post.featured_image) {
                const oldPath = path.join(__dirname, '..', 'public', post.featured_image);
                if (fs.existsSync(oldPath)) {
                    fs.unlink(oldPath, (err) => {
                        if (err) logger.error('Error deleting old image:', err);
                    });
                }
            }
            post.featured_image = `/uploads/blog/${req.file.filename}`;
        }
        
        await post.save();
        
        logger.info(`Blog post updated: ${post.title} by ${req.user.email}`);
        req.flash('success', 'Post updated successfully!');
        res.redirect('/admin/blog');
        
    } catch (error) {
        logger.error('Update blog post error:', error);
        
        if (req.file) {
            fs.unlink(path.join(__dirname, '..', 'public', req.file.path), (err) => {
                if (err) logger.error('Error deleting file:', err);
            });
        }
        
        req.flash('error', 'Error updating post: ' + error.message);
        res.redirect(`/admin/blog/${req.params.id}/edit`);
    }
};

// Delete blog post
exports.deleteBlogPost = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        // Delete featured image
        if (post.featured_image) {
            const imagePath = path.join(__dirname, '..', 'public', post.featured_image);
            if (fs.existsSync(imagePath)) {
                fs.unlink(imagePath, (err) => {
                    if (err) logger.error('Error deleting image:', err);
                });
            }
        }
        
        await post.deleteOne();
        
        logger.info(`Blog post deleted: ${post.title} by ${req.user.email}`);
        
        if (req.xhr || req.headers.accept.includes('json')) {
            res.json({ success: true, message: 'Post deleted successfully' });
        } else {
            req.flash('success', 'Post deleted successfully');
            res.redirect('/admin/blog');
        }
        
    } catch (error) {
        logger.error('Delete blog post error:', error);
        
        if (req.xhr || req.headers.accept.includes('json')) {
            res.status(500).json({ success: false, message: 'Error deleting post' });
        } else {
            req.flash('error', 'Error deleting post');
            res.redirect('/admin/blog');
        }
    }
};

// Toggle featured status
exports.toggleFeatured = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        post.isFeatured = !post.isFeatured;
        await post.save();
        
        res.json({ 
            success: true, 
            featured: post.isFeatured,
            message: post.isFeatured ? 'Post featured' : 'Post unfeatured'
        });
        
    } catch (error) {
        logger.error('Toggle featured error:', error);
        res.status(500).json({ success: false, message: 'Error toggling featured status' });
    }
};

// Toggle publish status
exports.togglePublish = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id);
        
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        post.isPublished = !post.isPublished;
        await post.save();
        
        res.json({ 
            success: true, 
            published: post.isPublished,
            message: post.isPublished ? 'Post published' : 'Post unpublished'
        });
        
    } catch (error) {
        logger.error('Toggle publish error:', error);
        res.status(500).json({ success: false, message: 'Error toggling publish status' });
    }
};

// Bulk delete posts
exports.bulkDelete = async (req, res) => {
    try {
        const { ids } = req.body;
        
        if (!ids || !ids.length) {
            return res.status(400).json({ success: false, message: 'No posts selected' });
        }
        
        // Delete images
        const posts = await BlogPost.find({ _id: { $in: ids } });
        
        posts.forEach(post => {
            if (post.featured_image) {
                const imagePath = path.join(__dirname, '..', 'public', post.featured_image);
                if (fs.existsSync(imagePath)) {
                    fs.unlink(imagePath, (err) => {
                        if (err) logger.error('Error deleting image:', err);
                    });
                }
            }
        });
        
        await BlogPost.deleteMany({ _id: { $in: ids } });
        
        logger.info(`Bulk deleted ${ids.length} posts by ${req.user.email}`);
        res.json({ success: true, message: `${ids.length} posts deleted` });
        
    } catch (error) {
        logger.error('Bulk delete error:', error);
        res.status(500).json({ success: false, message: 'Error deleting posts' });
    }
};

// Bulk publish/unpublish
exports.bulkPublish = async (req, res) => {
    try {
        const { ids, publish } = req.body;
        
        if (!ids || !ids.length) {
            return res.status(400).json({ success: false, message: 'No posts selected' });
        }
        
        await BlogPost.updateMany(
            { _id: { $in: ids } },
            { isPublished: publish === 'true' }
        );
        
        const action = publish === 'true' ? 'published' : 'unpublished';
        logger.info(`Bulk ${action} ${ids.length} posts by ${req.user.email}`);
        res.json({ success: true, message: `${ids.length} posts ${action}` });
        
    } catch (error) {
        logger.error('Bulk publish error:', error);
        res.status(500).json({ success: false, message: 'Error updating posts' });
    }
};

// Get blog posts API
exports.getBlogPostsAPI = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, category } = req.query;
        const skip = (page - 1) * limit;
        
        let filter = {};
        if (status === 'published') filter.isPublished = true;
        if (status === 'draft') filter.isPublished = false;
        if (category && category !== 'all') filter.category_slug = category;
        
        const posts = await BlogPost.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .populate('author', 'name email avatar');
        
        const total = await BlogPost.countDocuments(filter);
        
        res.json({
            success: true,
            posts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        logger.error('Get blog posts API error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving posts' });
    }
};

// Get single blog post API
exports.getBlogPostAPI = async (req, res) => {
    try {
        const post = await BlogPost.findById(req.params.id)
            .populate('author', 'name email avatar');
        
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        
        res.json({ success: true, post });
        
    } catch (error) {
        logger.error('Get blog post API error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving post' });
    }
};

// Get blog stats
exports.getBlogStats = async (req, res) => {
    try {
        const totalPosts = await BlogPost.countDocuments();
        const publishedPosts = await BlogPost.countDocuments({ isPublished: true });
        const draftPosts = await BlogPost.countDocuments({ isPublished: false });
        const featuredPosts = await BlogPost.countDocuments({ isFeatured: true });
        
        const totalViews = await BlogPost.aggregate([
            { $group: { _id: null, total: { $sum: '$views' } } }
        ]);
        
        const postsByCategory = await BlogPost.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        
        const recentPosts = await BlogPost.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('title views createdAt');
        
        res.json({
            success: true,
            stats: {
                totalPosts,
                publishedPosts,
                draftPosts,
                featuredPosts,
                totalViews: totalViews[0]?.total || 0,
                postsByCategory,
                recentPosts
            }
        });
        
    } catch (error) {
        logger.error('Get blog stats error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving stats' });
    }
};
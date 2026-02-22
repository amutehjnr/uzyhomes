const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');
const Admin = require('../models/Admin');
require('dotenv').config();

// Sample blog data
const blogPosts = [
    {
        title: 'The Art of Quiet Luxury: Designing Spaces That Whisper',
        slug: 'the-art-of-quiet-luxury',
        excerpt: 'True luxury isn\'t loud or ostentatious. It\'s found in the subtle details, the quality of light, the texture of linen, the weight of a well-crafted object.',
        content: `
            <p>True luxury isn't loud or ostentatious. It's found in the subtle details, the quality of light, the texture of linen, the weight of a well-crafted object. In this deep dive, we explore the principles of quiet luxury and how to bring them into your home.</p>
            
            <h2>The Essence of Quiet Luxury</h2>
            <p>Quiet luxury is about refinement without display. It's the difference between shouting and whispering. In interior design, this manifests as spaces that feel calm, composed, and deeply personal rather than ostentatious or trendy.</p>
            
            <h2>Key Elements of Quiet Luxury</h2>
            <ul>
                <li><strong>Quality Materials:</strong> Natural stone, solid wood, linen, wool — materials that age beautifully</li>
                <li><strong>Subtle Details:</strong> Hand-finished edges, perfectly proportioned spaces, thoughtful joinery</li>
                <li><strong>Restrained Palette:</strong> Muted tones that create a sense of calm and sophistication</li>
                <li><strong>Timeless Design:</strong> Pieces that transcend trends and will be cherished for years</li>
            </ul>
            
            <h2>Bringing It Home</h2>
            <p>Creating a space of quiet luxury doesn't require a massive budget. It's about being intentional with every choice, investing in fewer but better pieces, and creating a home that reflects your values and brings you peace.</p>
        `,
        category: 'Quiet Luxury',
        category_slug: 'quiet-luxury',
        featured_image: '/images/blog/featured.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: true,
        isPublished: true,
        isPopular: true,
        views: 1245,
        readTime: 6,
        tags: ['quiet luxury', 'minimalism', 'intentional living'],
        publishedAt: new Date('2026-03-15')
    },
    {
        title: 'Bringing Nature Indoors: A Guide to Biophilic Design',
        slug: 'biophilic-design',
        excerpt: 'How to create a deeper connection with nature in your home through thoughtful design, natural materials, and organic forms.',
        content: `
            <p>Biophilic design is more than just adding plants to a room. It's about creating a fundamental connection between humans and nature within the built environment. This approach has been shown to reduce stress, improve cognitive function, and enhance overall wellbeing.</p>
            
            <h2>Key Principles of Biophilic Design</h2>
            <ul>
                <li><strong>Natural Light:</strong> Maximizing daylight and mimicking natural light patterns</li>
                <li><strong>Organic Forms:</strong> Incorporating curves, flows, and patterns found in nature</li>
                <li><strong>Natural Materials:</strong> Using wood, stone, bamboo, and other natural elements</li>
                <li><strong>Living Elements:</strong> Integrating plants, water features, and living walls</li>
            </ul>
            
            <h2>Practical Tips</h2>
            <p>Start with houseplants that thrive indoors, choose furniture with organic shapes, and opt for natural fiber textiles like linen and wool. Even small changes can make a significant difference in how connected you feel to nature.</p>
        `,
        category: 'Interior Design',
        category_slug: 'interior-design',
        featured_image: '/images/blog/biophilic.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: false,
        views: 876,
        readTime: 5,
        tags: ['biophilic', 'nature', 'natural materials', 'plants'],
        publishedAt: new Date('2026-03-10')
    },
    {
        title: 'The Power of Neutrals: Creating Depth with a Muted Palette',
        slug: 'neutral-palettes',
        excerpt: 'Neutral doesn\'t mean boring. Learn how to layer textures, tones, and materials to create rich, inviting spaces.',
        content: `
            <p>Neutral doesn't mean boring. Learn how to layer textures, tones, and materials to create rich, inviting spaces that feel anything but flat.</p>
            
            <h2>Layering Textures</h2>
            <p>The key to a successful neutral palette is texture. Mix smooth surfaces with rough ones, soft fabrics with hard materials. Consider pairing a chunky knit throw with a smooth leather sofa, or placing a rough stone vase on a polished wood table.</p>
            
            <h2>Playing with Tones</h2>
            <p>Use varying shades of the same color family. Combine warm beiges with cool greys, or add depth with charcoal accents. The contrast creates visual interest while maintaining a calm, cohesive look.</p>
        `,
        category: 'Home Styling',
        category_slug: 'home-styling',
        featured_image: '/images/blog/neutral.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: true,
        isPublished: true,
        isPopular: false,
        views: 654,
        readTime: 4,
        tags: ['neutrals', 'color palette', 'texture', 'styling'],
        publishedAt: new Date('2026-03-05')
    },
    {
        title: 'Behind the Design: The Aurelia Residence',
        slug: 'behind-scenes-aurelia',
        excerpt: 'An inside look at our process for creating the award-winning Aurelia Residence, from initial concept to final reveal.',
        content: `
            <p>Take a behind-the-scenes journey through our design process for the award-winning Aurelia Residence in Maitama, Abuja. From the initial client consultation to the final installation, discover how we brought this vision to life.</p>
            
            <h2>The Vision</h2>
            <p>The clients wanted a home that felt both modern and warm, with clean lines but plenty of soul. They valued quality over quantity and wanted every piece to have meaning.</p>
            
            <h2>The Process</h2>
            <p>We began with extensive conversations about their lifestyle, how they entertain, and how they wanted to feel in each room. This informed every decision from the layout to the material selections.</p>
        `,
        category: 'Behind the Scenes',
        category_slug: 'behind-the-scenes',
        featured_image: '/images/blog/aurelia-behind.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: true,
        views: 432,
        readTime: 5,
        tags: ['behind the scenes', 'process', 'aurelia', 'project'],
        publishedAt: new Date('2026-02-28')
    },
    {
        title: 'Sustainable Luxury: Choosing Quality That Lasts',
        slug: 'sustainable-luxury',
        excerpt: 'Why investing in well-made, timeless pieces is both more sustainable and more luxurious than fast furniture.',
        content: `
            <p>In a world of fast furniture and disposable design, choosing quality pieces that will last for generations is both a sustainable choice and a luxury statement.</p>
            
            <h2>The Problem with Fast Furniture</h2>
            <p>Mass-produced furniture often uses poor materials and construction methods, leading to pieces that need replacement every few years. This cycle creates waste and ultimately costs more.</p>
            
            <h2>Investing in Quality</h2>
            <p>Well-made furniture from solid wood, natural stone, and quality textiles can last a lifetime and beyond. These pieces gain character with age and become part of your home's story.</p>
        `,
        category: 'Quiet Luxury',
        category_slug: 'quiet-luxury',
        featured_image: '/images/blog/sustainable.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: false,
        views: 321,
        readTime: 4,
        tags: ['sustainable', 'quality', 'investment', 'timeless'],
        publishedAt: new Date('2026-02-20')
    },
    {
        title: 'The Importance of Layered Lighting',
        slug: 'lighting-design',
        excerpt: 'How thoughtful lighting design can transform the mood and functionality of any room.',
        content: `
            <p>Lighting is one of the most important yet often overlooked elements of interior design. The right lighting can transform a room from flat and uninviting to warm and dimensional.</p>
            
            <h2>The Three Layers</h2>
            <p>Effective lighting design uses three layers: ambient lighting for overall illumination, task lighting for specific activities, and accent lighting to highlight architectural features or artwork.</p>
            
            <h2>Creating Mood</h2>
            <p>Dimmers allow you to adjust the intensity based on the time of day or desired atmosphere. Warm, soft light creates intimacy while brighter light energizes.</p>
        `,
        category: 'Interior Design',
        category_slug: 'interior-design',
        featured_image: '/images/blog/lighting.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: false,
        views: 567,
        readTime: 4,
        tags: ['lighting', 'ambiance', 'design tips'],
        publishedAt: new Date('2026-02-15')
    },
    {
        title: 'Client Story: The Magnolia Penthouse',
        slug: 'client-story-magnolia',
        excerpt: 'How we worked with Chinedu to transform his penthouse into a peaceful urban sanctuary.',
        content: `
            <p>Chinedu came to us with a challenge: his penthouse had stunning views but felt cold and impersonal. He wanted a space that felt like a retreat from his demanding career.</p>
            
            <h2>The Vision</h2>
            <p>We focused on creating zones for different activities while maintaining an open, airy feel. A reading nook by the window, a cozy media area, and a dining space perfect for intimate gatherings.</p>
            
            <h2>The Result</h2>
            <p>The transformed space now serves as Chinedu's sanctuary. "Every evening feels like a getaway," he says. "It's exactly what I wanted."</p>
        `,
        category: 'Client Stories',
        category_slug: 'client-stories',
        featured_image: '/images/blog/magnolia-story.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: false,
        views: 298,
        readTime: 4,
        tags: ['client story', 'penthouse', 'urban sanctuary'],
        publishedAt: new Date('2026-02-08')
    },
    {
        title: 'What Quiet Luxury Really Means',
        slug: 'quiet-luxury-defined',
        excerpt: 'Understanding the philosophy behind quiet luxury and how to incorporate it into your home.',
        content: `
            <p>The term "quiet luxury" gets thrown around a lot, but what does it actually mean in practice? At its core, quiet luxury is about prioritizing quality, craftsmanship, and timelessness over trends and logos.</p>
            
            <h2>Beyond Aesthetics</h2>
            <p>Quiet luxury extends beyond how things look to how they feel and function. It's the perfect weight of a door handle, the softness of well-worn linen, the satisfaction of a well-crafted joint.</p>
        `,
        category: 'Quiet Luxury',
        category_slug: 'quiet-luxury',
        featured_image: '/images/blog/popular-1.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: true,
        views: 892,
        readTime: 3,
        tags: ['quiet luxury', 'philosophy', 'design principles'],
        publishedAt: new Date('2026-01-15')
    },
    {
        title: '5 Essential Pieces for a Timeless Home',
        slug: '5-essential-pieces',
        excerpt: 'Investment pieces that will never go out of style and form the foundation of any well-designed room.',
        content: `
            <p>Every well-designed home needs a foundation of timeless pieces that can adapt to changing trends and personal style. Here are five essentials worth investing in.</p>
            
            <h2>1. A Quality Sofa</h2>
            <p>The sofa is often the largest piece in your living room and gets the most use. Invest in one with a timeless silhouette, quality construction, and durable fabric.</p>
            
            <h2>2. A Solid Wood Dining Table</h2>
            <p>A well-made dining table becomes the heart of your home, hosting everything from family meals to dinner parties.</p>
            
            <h2>3. A Comfortable Armchair</h2>
            <p>A great armchair offers a spot for reading, contemplation, or simply enjoying a quiet moment. Look for ergonomic support and quality upholstery.</p>
            
            <h2>4. Quality Bedding</h2>
            <p>We spend a third of our lives in bed. Invest in high-quality sheets, pillows, and duvets for better sleep and daily comfort.</p>
            
            <h2>5. Statement Lighting</h2>
            <p>A beautiful light fixture can anchor a room and provide both function and artistry. Choose something that speaks to your style.</p>
        `,
        category: 'Home Styling',
        category_slug: 'home-styling',
        featured_image: '/images/blog/popular-2.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: true,
        views: 743,
        readTime: 5,
        tags: ['essentials', 'investment', 'timeless'],
        publishedAt: new Date('2026-01-05')
    },
    {
        title: 'The Psychology of Color in Interiors',
        slug: 'color-psychology',
        excerpt: 'How different colors affect mood and how to choose the right palette for each room.',
        content: `
            <p>Color has a profound effect on our emotions and wellbeing. Understanding color psychology can help you create spaces that feel just right for their intended purpose.</p>
            
            <h2>Warm vs. Cool</h2>
            <p>Warm colors like reds, oranges, and yellows can feel energizing and cozy but may be overwhelming in large doses. Cool colors like blues and greens tend to feel calming and serene.</p>
            
            <h2>Room by Room</h2>
            <p><strong>Living Room:</strong> Warm neutrals create an inviting atmosphere. Accent with calming blues or greens.</p>
            <p><strong>Bedroom:</strong> Cool, muted tones like lavender, sage, or soft blue promote restful sleep.</p>
            <p><strong>Home Office:</strong> Focus-enhancing colors like soft greens or warm neutrals work well.</p>
            <p><strong>Kitchen:</strong> Energetic but not overwhelming — soft yellows, warm whites, or earthy tones.</p>
        `,
        category: 'Interior Design',
        category_slug: 'interior-design',
        featured_image: '/images/blog/popular-3.jpg',
        author_name: 'UZY HOMES Design Team',
        isFeatured: false,
        isPublished: true,
        isPopular: true,
        views: 512,
        readTime: 4,
        tags: ['color', 'psychology', 'palette'],
        publishedAt: new Date('2025-12-28')
    }
];

async function seedBlog() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/uzyhomes');
        console.log('✅ Connected to MongoDB');

        // Find an admin user to set as author
        let admin = await Admin.findOne({ email: 'mustaeenms@gmail.com' });
        
        if (!admin) {
            console.log('❌ Admin with email mustaeenms@gmail.com not found. Looking for any admin...');
            admin = await Admin.findOne({ role: 'admin' });
        }
        
        if (!admin) {
            console.log('❌ No admin found. Please create an admin first.');
            console.log('You can create an admin through the admin signup page.');
            process.exit(1);
        }

        console.log(`✅ Using admin: ${admin.firstName} ${admin.lastName} (${admin.email})`);

        // Clear existing blog posts
        await BlogPost.deleteMany({});
        console.log('🗑️ Cleared existing blog posts');

        // Prepare posts with author ID
        const postsWithAuthor = blogPosts.map(post => ({
            ...post,
            author: admin._id, // Set the author ObjectId
            publishedAt: post.publishedAt || new Date()
        }));

        // Insert posts
        const result = await BlogPost.insertMany(postsWithAuthor);
        console.log(`✅ Successfully seeded ${result.length} blog posts`);

        // Log the posts
        console.log('\n📋 Seeded posts:');
        result.forEach((post, index) => {
            console.log(`${index + 1}. ${post.title}`);
            console.log(`   Slug: /${post.slug}`);
            console.log(`   Category: ${post.category}`);
            console.log(`   Author: ${post.author_name}`);
            console.log(`   Published: ${post.publishedAt.toLocaleDateString()}`);
            console.log('');
        });

        // Disconnect
        await mongoose.disconnect();
        console.log('✅ Database disconnected');

    } catch (error) {
        console.error('❌ Error seeding blog:', error);
        process.exit(1);
    }
}

// Run the seed function
seedBlog();